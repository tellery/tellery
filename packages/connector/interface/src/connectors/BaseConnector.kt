package io.tellery.connectors

import arrow.core.*
import io.tellery.entities.*
import io.tellery.interfaces.*
import io.tellery.utils.*
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.*
import kotlinx.coroutines.sync.*
import mu.*


abstract class BaseConnector : IConnector {

    // Caches
    private var _databases: Cache<String, List<String>> = Cache({ this.getDatabases() }, 60 * 60 * 2)
    private var _collections: Cache<String, List<CollectionField>> =
        Cache({ key -> this.getCollections(key) }, 60 * 60 * 2)
    private var _schema: Cache<Triple<String, String, String?>, List<TypeField>> =
        Cache({ (dbName, collectionName, schemaName) -> this.getCollectionSchema(dbName, collectionName, schemaName) },
            60 * 60 * 2)

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

    fun getCachedCollectionSchema(dbName: String, collectionName: String, schemaName: String?): List<TypeField> {
        return _schema.get(Triple(dbName, collectionName, schemaName))
    }

    // Here the channel is Either because the query runs in a different scope from grpc calling handler, which causes
    // the exception thrown there won't be handled correctly (in this scenario, wrapping to StatusRuntimeException and
    // returning back to the client.
    // SupervisorJob right here stands for properly propagating the cancellation made by an exception upward.
    // See https://kotlinlang.org/docs/reference/coroutines/exception-handling.html#supervision-job
    suspend fun queryWithLimit(ctx: QueryContext, channel: Channel<Either<Exception, QueryResultWrapper>>): Job {
        return scope.launch(SupervisorJob()) {
            try {
                withTimeout(10 * 60 * 1000) {
                    semaphore.withPermit {
                        logger.info("start query ${ctx.questionId}")
                        query(ctx) { item -> channel.send(Either.Right(item)) }
                    }
                }
            } catch (e: Exception) {
                channel.send(Either.Left(e))
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
