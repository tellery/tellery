package io.tellery.connectors

import io.tellery.entities.*
import io.tellery.interfaces.IConnector
import io.tellery.utils.Cache
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import mu.KotlinLogging


abstract class BaseConnector : IConnector {

    // Caches
    private var _databases: Cache<String, List<String>> =
        Cache({ this.getDatabases() }, 60 * 60 * 2L)
    private var _collections: Cache<String, List<CollectionField>> =
        Cache({ key -> this.getCollections(key) }, 60 * 60 * 2L)
    private var _schema: Cache<Triple<String, String, String?>, List<TypeField>> =
        Cache(
            { (dbName, collectionName, schemaName) ->
                this.getCollectionSchema(
                    dbName,
                    collectionName,
                    schemaName
                )
            },
            60 * 60 * 2L
        )

    protected var scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
    private val semaphore = Semaphore(10)

    override lateinit var importDispatcher: Map<String, ImportHandler>

    override val logger = KotlinLogging.logger { }

    fun getCachedDatabases(): List<String> {
        return _databases.get("db")
    }

    fun getCachedCollections(dbName: String): List<CollectionField> {
        return _collections.get(dbName)
    }

    fun getCachedCollectionSchema(
        dbName: String,
        collectionName: String,
        schemaName: String?
    ): List<TypeField> {
        return _schema.get(Triple(dbName, collectionName, schemaName))
    }

    // Here the channel is Either because the query runs in a different scope from grpc calling handler, which causes
    // the exception thrown there won't be handled correctly (in this scenario, wrapping to StatusRuntimeException and
    // returning back to the client.
    // SupervisorJob right here stands for properly propagating the cancellation made by an exception upward.
    // See https://kotlinlang.org/docs/reference/coroutines/exception-handling.html#supervision-job
    suspend fun queryWithLimit(ctx: QueryContext, channel: Channel<QueryResultSet>): Job {
        return scope.launch(SupervisorJob()) {
            try {
                withTimeout(10 * 60 * 1000L) {
                    semaphore.withPermit {
                        logger.info("start query ${ctx.questionId}")
                        query(ctx) { channel.send(it) }
                    }
                }
            } catch (e: Exception) {
                channel.send(QueryResultSet.Error(e))
            } finally {
                channel.close()
            }
        }
    }

    override fun importSanityCheck(database: String, collection: String, schema: String?): Unit {
        if (CollectionField(collection, schema) in getCachedCollections(database)) {
            throw CollectionExistsException()
        }
    }
}
