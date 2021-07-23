package io.tellery.services

import arrow.core.Either
import com.google.gson.GsonBuilder
import com.google.protobuf.ByteString
import com.google.protobuf.Empty
import io.tellery.annotations.Config
import io.tellery.common.ConfigManager
import io.tellery.common.ConnectorManager
import io.tellery.common.dbt.Constants.EXTERNAL_CONFIG_FIELDS
import io.tellery.common.dbt.DbtManager
import io.tellery.configs.AvailableConfig
import io.tellery.configs.AvailableConfigs
import io.tellery.configs.ConfigField
import io.tellery.entities.*
import io.tellery.grpc.*
import io.tellery.services.Utils.errorWrapper
import io.tellery.services.Utils.withErrorWrapper
import io.tellery.types.SQLType
import io.tellery.utils.DateAsTimestampSerializer
import io.tellery.utils.toDisplayType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asContextElement
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.SendChannel
import kotlinx.coroutines.channels.consumeEach
import java.nio.charset.StandardCharsets.UTF_8
import java.sql.Date
import java.sql.Timestamp
import kotlin.coroutines.CoroutineContext

class ConnectorService : ConnectorCoroutineGrpc.ConnectorImplBase() {

    private val currThreadLocal = ThreadLocal<String>().asContextElement()

    override val initialContext: CoroutineContext
        get() = Dispatchers.Default + currThreadLocal

    private val serializer = GsonBuilder()
        .serializeSpecialFloatingPointValues()
        .registerTypeAdapter(Date::class.java, DateAsTimestampSerializer())
        .registerTypeAdapter(Timestamp::class.java, DateAsTimestampSerializer())
        .create()

    private val secretMask = "**TellerySecretField**"

    private fun buildConfigFieldFromAnnotation(confAnnotation: Config): ConfigField {
        return ConfigField {
            name = confAnnotation.name
            type = confAnnotation.type.name
            description = confAnnotation.description
            hint = confAnnotation.hint
            required = confAnnotation.required
            secret = confAnnotation.secret
        }
    }

    override suspend fun getAvailableConfigs(request: Empty): AvailableConfigs {
        return withErrorWrapper(request) {
            AvailableConfigs {
                addAllAvailableConfigs(ConnectorManager.getAvailableConfigs().map {
                    AvailableConfig {
                        type = it.type
                        addAllConfigs(it.configs.map(::buildConfigFieldFromAnnotation))
                    }
                })
            }
        }
    }

    private val loadedProfiles: Profiles
        get() = Profiles {
            addAllProfiles(ConnectorManager.getCurrentProfiles().values.map {
                val connectorMeta =
                    ConnectorManager.getAvailableConfigs().find { cfg -> cfg.type == it.type }!!
                val secretConfigs =
                    connectorMeta.configs.filter { it.secret }.map { it.name }.toSet()
                ProfileBody {
                    type = it.type
                    name = it.name
                    putAllConfigs(it.configs.entries.associate { (k, v) ->
                        if (secretConfigs.contains(k)) {
                            k to secretMask
                        } else {
                            k to v
                        }
                    })
                }
            })
        }


    private fun handleSecretField(requestField: String, originalField: String?): String {
        return if (originalField != null && requestField == secretMask) {
            originalField
        } else {
            requestField
        }
    }

    override suspend fun upsertProfile(request: UpsertProfileRequest): Profiles {
        return withErrorWrapper(request) { req ->
            if (req.name.isNullOrBlank() || req.type.isNullOrBlank()) {
                throw InvalidParamException()
            }
            val originalProfile = ConfigManager.profiles.find { it.name == req.name }

            val connectorMeta =
                ConnectorManager.getAvailableConfigs().find { cfg -> cfg.type == req.type }
                    ?: throw CustomizedException("invalid db type or invalid params")
            val configFields = connectorMeta.configs.associateBy { it.name }
            val configs =
                req.configsList
                    .filter { configFields.contains(it.key) || EXTERNAL_CONFIG_FIELDS.contains(it.key) }
                    .associate { it.key to it.value }

            val requiredKeys = configFields.filterValues { it.required }.map { it.key }
            // check if required fields appears non-blank
            if (!configs.filterValues { it.isNotBlank() }.keys.containsAll(requiredKeys)) {
                throw InvalidParamException()
            }

            val newProfile = Profile(
                req.type,
                req.name,
                configs.entries.associate { (k, v) ->
                    k to handleSecretField(v, originalProfile?.configs?.get(k))
                }.filterValues { it.isNotBlank() }
            )

            val newProfiles = ConfigManager.profiles.filter { it.name != req.name } + newProfile
            ConfigManager.saveProfiles(newProfiles)
            ConnectorManager.initializeProfile(newProfile)
            DbtManager.reloadDbtProfiles(newProfiles)
            loadedProfiles
        }
    }

    override suspend fun deleteProfile(request: DeleteProfileRequest): Profiles {
        return withErrorWrapper(request) { req ->
            ConfigManager.saveProfiles(ConfigManager.profiles.filter { it.name != req.name })
            ConnectorManager.offloadProfile(req.name)
            DbtManager.removeRepo(req.name)
            loadedProfiles
        }
    }

    override suspend fun getProfiles(request: Empty): Profiles {
        return withErrorWrapper(request) { loadedProfiles }
    }

    override suspend fun getDatabases(request: GetDatabaseRequest): Databases {
        return withErrorWrapper(request) { req ->
            Databases {
                addAllDatabase(
                    ConnectorManager.getDBConnector(req.profile).getCachedDatabases()
                )
            }
        }
    }

    override suspend fun getCollections(request: GetCollectionRequest): Collections {
        return withErrorWrapper(request) { req ->
            Collections {
                addAllCollections(
                    ConnectorManager.getDBConnector(req.profile).getCachedCollections(req.database)
                        .map {
                            CollectionField {
                                collection = it.collection
                                it.schema?.let {
                                    schema = it
                                }
                            }
                        }
                )
            }
        }
    }

    override suspend fun getCollectionSchema(request: GetCollectionSchemaRequest): Schema {
        return withErrorWrapper(request) { req ->
            Schema {
                addAllFields(
                    ConnectorManager.getDBConnector(req.profile)
                        .getCachedCollectionSchema(req.database, req.collection, req.schema).map {
                            SchemaField {
                                name = it.name
                                displayType = toDisplayType(it.type)
                                sqlType = SQLType.forNumber(it.type)
                            }
                        }
                )
            }
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    override suspend fun query(
        request: SubmitQueryRequest,
        responseChannel: SendChannel<QueryResult>
    ) {
        val currentQueryChannel = Channel<Either<Exception, QueryResultWrapper>>()
        val queryContext = QueryContext(request.sql, request.questionId, request.maxRow)
        val connector = ConnectorManager.getDBConnector(request.profile)
        connector.queryWithLimit(queryContext, currentQueryChannel)
        currentQueryChannel.consumeEach { cursor ->
            when (cursor) {
                is Either.Left -> {
                    when (cursor.a) {
                        is TruncateException -> {
                            responseChannel.send(QueryResult {
                                truncated = true
                            })
                        }
                        else -> throw errorWrapper(cursor.a, "query")
                    }
                }
                is Either.Right -> {
                    when (val content = cursor.b) {
                        is Either.Left -> {
                            responseChannel.send(QueryResult {
                                fields {
                                    addAllFields(content.a.map {
                                        SchemaField {
                                            name = it.name
                                            displayType = toDisplayType(it.type)
                                            sqlType = SQLType.forNumber(it.type)
                                        }
                                    })
                                }
                            })
                        }
                        is Either.Right -> {
                            responseChannel.send(QueryResult {
                                row = ByteString.copyFrom(serializer.toJson(content.b), UTF_8)
                            })
                        }
                    }
                }
            }
        }
    }

    override suspend fun importFromFile(request: ImportRequest): ImportResult {
        return withErrorWrapper(request) { req ->
            val connector = ConnectorManager.getDBConnector(req.profile)

            connector.import(
                req.database,
                req.collection,
                req.schema.ifBlank { null },
                req.url
            )

            ImportResult {
                database = req.database
                collection = req.collection
                if (req.schema.isNotBlank()) schema = req.schema
            }
        }
    }
}

