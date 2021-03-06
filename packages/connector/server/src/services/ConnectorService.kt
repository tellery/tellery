package io.tellery.services

import com.google.gson.GsonBuilder
import com.google.protobuf.ByteString
import com.google.protobuf.Empty
import io.tellery.common.errorWrapper
import io.tellery.common.withErrorWrapper
import io.tellery.entities.QueryContext
import io.tellery.entities.QueryResultSet
import io.tellery.entities.TruncateException
import io.tellery.grpc.*
import io.tellery.managers.ConnectorManager
import io.tellery.types.SQLType
import io.tellery.utils.TimestampSerializer
import io.tellery.utils.toDisplayType
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.channels.SendChannel
import kotlinx.coroutines.channels.consumeEach
import java.nio.charset.StandardCharsets
import java.sql.Date
import java.sql.SQLException
import java.sql.Time
import java.sql.Timestamp

class ConnectorService(private val connectorManager: ConnectorManager) :
    ConnectorServiceCoroutineGrpc.ConnectorServiceImplBase() {

    private val serializer = GsonBuilder()
        .serializeSpecialFloatingPointValues()
        .registerTypeAdapter(Time::class.java, TimestampSerializer())
        .registerTypeAdapter(Date::class.java, TimestampSerializer())
        .registerTypeAdapter(Timestamp::class.java, TimestampSerializer())
        .create()

    override suspend fun getDatabases(request: Empty): Databases {
        return withErrorWrapper {
            Databases {
                addAllDatabase(
                    connectorManager.getConnector().getCachedDatabases()
                )
            }
        }
    }

    override suspend fun getCollections(request: GetCollectionRequest): Collections {
        return withErrorWrapper {
            Collections {
                addAllCollections(
                    connectorManager.getConnector().getCachedCollections(request.database)
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
        return withErrorWrapper {
            Schema {
                addAllFields(
                    connectorManager.getConnector()
                        .getCachedCollectionSchema(
                            request.database,
                            request.collection,
                            request.schema
                        )
                        .map {
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

    override suspend fun query(
        request: SubmitQueryRequest,
        responseChannel: SendChannel<QueryResult>
    ) {
        val currentQueryChannel = Channel<QueryResultSet>()
        val queryContext = QueryContext(request.sql, request.questionId, request.maxRow)
        val connector = connectorManager.getConnector()
        connector.queryWithLimit(queryContext, currentQueryChannel)
        currentQueryChannel.consumeEach { cursor ->
            when (cursor) {
                is QueryResultSet.Error -> {
                    when (cursor.value) {
                        is TruncateException -> {
                            responseChannel.send(QueryResult {
                                truncated = true
                            })
                        }
                        is SQLException -> {
                            responseChannel.send(QueryResult {
                                error = cursor.value.message
                            })
                        }
                        else -> throw errorWrapper(cursor.value, "query")
                    }
                }
                is QueryResultSet.Fields -> {
                    responseChannel.send(QueryResult {
                        fields {
                            addAllFields(cursor.value.map {
                                SchemaField {
                                    name = it.name
                                    displayType = toDisplayType(it.type)
                                    sqlType = SQLType.forNumber(it.type)
                                }
                            })
                        }
                    })
                }
                is QueryResultSet.Rows -> {
                    responseChannel.send(QueryResult {
                        row = ByteString.copyFrom(
                            serializer.toJson(cursor.value),
                            StandardCharsets.UTF_8
                        )
                    })
                }
            }
        }
    }

    override suspend fun importFromUrl(request: ImportUrlRequest): ImportResult {
        return withErrorWrapper {
            val connector = connectorManager.getConnector()

            connector.import(
                request.database,
                request.collection,
                request.schema.ifBlank { null },
                request.url
            )

            ImportResult {
                database = request.database
                collection = request.collection
                if (request.schema.isNotBlank()) schema = request.schema
            }
        }
    }

    override suspend fun importFromFile(request: ImportFileRequest): ImportResult {
        return withErrorWrapper {
            val connector = connectorManager.getConnector()

            connector.import(
                request.database,
                request.collection,
                request.schema.ifBlank { null },
                request.contentType,
                request.fileBodyBytes.toByteArray()
            )

            ImportResult {
                database = request.database
                collection = request.collection
                if (request.schema.isNotBlank()) schema = request.schema
            }
        }
    }
}