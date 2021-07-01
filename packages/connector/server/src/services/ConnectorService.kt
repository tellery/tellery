package io.tellery.services

import arrow.core.Either
import com.google.gson.GsonBuilder
import com.google.protobuf.ByteString
import com.google.protobuf.Empty
import io.grpc.Status
import io.grpc.Metadata
import io.grpc.StatusRuntimeException
import io.tellery.common.ConfigManager
import io.tellery.common.ConnectorManager
import io.tellery.entities.*
import io.tellery.grpc.*
import io.tellery.types.SQLType
import io.tellery.utils.DateAsTimestampSerializer
import io.tellery.utils.toDisplayType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.asContextElement
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.SendChannel
import kotlinx.coroutines.channels.consumeEach
import mu.KotlinLogging
import java.nio.charset.StandardCharsets.UTF_8
import java.sql.Date
import java.sql.SQLException
import java.sql.Timestamp
import kotlin.coroutines.CoroutineContext

class ConnectorService : ConnectorCoroutineGrpc.ConnectorImplBase() {

    private val logger = KotlinLogging.logger { }

    private val currThreadLocal = ThreadLocal<String>().asContextElement()

    override val initialContext: CoroutineContext
        get() = Dispatchers.Default + currThreadLocal

    private val serializer = GsonBuilder()
        .serializeSpecialFloatingPointValues()
        .registerTypeAdapter(Date::class.java, DateAsTimestampSerializer())
        .registerTypeAdapter(Timestamp::class.java, DateAsTimestampSerializer())
        .create()

    private fun errorWrapper(e: Exception, decoratedName: String): StatusRuntimeException {
        return when (e) {
            is StatusRuntimeException -> e
            is SQLException -> {
                StatusRuntimeException(Status.UNAVAILABLE.withCause(e).withDescription("SQL Error: ${e.message}"),
                    Metadata())
            }
            else -> {
                logger.error("Error when handling $decoratedName", e)
                StatusRuntimeException(Status.INTERNAL.withCause(e).withDescription("Internal Error: ${e.message}"),
                    Metadata())
            }
        }
    }

    private suspend fun <S, T> withErrorWrapper(request: S, handler: suspend (request: S) -> T): T {
        try {
            return handler(request)
        } catch (e: Exception) {
            throw errorWrapper(e, handler.javaClass.enclosingMethod.name)
        }
    }

    override suspend fun getAvailableConfigs(request: Empty): AvailableConfigs {
        return withErrorWrapper(request) {
            AvailableConfigs {
                addAllAvailableConfigs(ConnectorManager.getAvailableConfigs().map {
                    AvailableConfig {
                        type = it.type
                        addAllOptionals(it.optionals)
                        addAllSecretOptionals(it.secretOptionals)
                    }
                })
            }
        }
    }

    private val loadedProfiles: Profiles
        get() = Profiles {
            addAllProfiles(ConnectorManager.getCurrentProfiles().values.map {
                val (_, optionalFields, secretOptionalFields) = ConnectorManager.getAvailableConfigs()
                    .find { original -> original.type == it.type }!!
                val currentOptionals = it.optionals?.filterKeys { key -> optionalFields.contains(key) }
                val currentSecretOptionals = it.optionals?.keys?.filter { key -> secretOptionalFields.contains(key) }
                ProfileProtobuf {

                    type = it.type
                    name = it.name
                    connectionStr = it.connectionStr

                    currentOptionals?.let {
                        putAllOptionals(currentOptionals)
                    }

                    currentSecretOptionals?.let {
                        addAllSecretOptionals(currentSecretOptionals)
                    }

                    it.auth?.let {
                        auth = Auth {
                            username = it.username
                            // For security, the password won't be returned
                        }
                    }
                }
            })
        }


    override suspend fun upsertProfile(request: UpsertProfileRequest): Profiles {
        return withErrorWrapper(request) { req ->
            if (req.name.isNullOrBlank()) {
                throw InvalidParamException()
            }
            val originalProfile = ConfigManager.profiles.find { it.name == req.name }

            val (_, optionalFields, secretOptionalFields) = ConnectorManager.getAvailableConfigs()
                .find { it.type == originalProfile?.type ?: req.type }
                ?: throw CustomizedException("invalid db type or invalid params")

            val optionals =
                req.optionalsList.filter { optionalFields.contains(it.key) || secretOptionalFields.contains(it.key) }
                    .associate { Pair(it.key, it.value) }

            // distinguish create and update
            val newProfile = if (originalProfile == null) {
                //Insertion
                if (req.type.isNullOrBlank() || req.connectionStr.isNullOrBlank()) {
                    throw InvalidParamException()
                }
                Profile(
                    req.type,
                    req.name,
                    if (req.hasAuth()) {
                        ConnectionAuth(
                            req.auth.username,
                            req.auth.password,
                        )
                    } else null,
                    req.connectionStr,
                    null,
                    optionals.filterValues { it.isNotBlank() }
                )
            } else {
                // check if auth has been unset
                val newAuth = if (req.hasAuth()) {
                    if (req.auth.username.isNotBlank() || req.auth.password.isNotBlank()) {
                        ConnectionAuth(
                            req.auth.username.ifBlank { originalProfile.auth?.username }
                                ?: throw InvalidParamException(),
                            req.auth.password.ifBlank { originalProfile.auth?.password }
                        )
                    } else null
                } else originalProfile.auth

                Profile(
                    originalProfile.type,
                    originalProfile.name,
                    newAuth,
                    req.connectionStr.ifBlank { originalProfile.connectionStr },
                    null,
                    (originalProfile.optionals?.filterKeys { k -> !optionals.containsKey(k) }
                        ?: mapOf()) + optionals.filterValues { v -> v.isNotBlank() }
                    // v.isNotBlank() means that value is non-null (in the scenario of grpc)
                    // null value => corresponding key should be deleted
                )
            }

            val newProfiles = ConfigManager.profiles.filter { it.name != req.name } + newProfile
            ConfigManager.saveProfiles(newProfiles)
            ConnectorManager.initializeProfile(newProfile)
            loadedProfiles
        }
    }

    override suspend fun deleteProfile(request: DeleteProfileRequest): Profiles {
        return withErrorWrapper(request) { req ->
            ConfigManager.saveProfiles(ConfigManager.profiles.filter { it.name != req.name })
            ConnectorManager.offloadProfile(req.name)
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
                    ConnectorManager.getDBConnector(req.profile).getCachedCollections(req.database).map {
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
    override suspend fun query(request: SubmitQueryRequest, responseChannel: SendChannel<QueryResult>) {
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

            connector.import(req.database,
                req.collection,
                req.schema.ifBlank { null },
                req.url)

            ImportResult {
                database = req.database
                collection = req.collection
                if (req.schema.isNotBlank()) schema = req.schema
            }
        }
    }
}

