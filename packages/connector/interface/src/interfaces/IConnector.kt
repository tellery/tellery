package io.tellery.interfaces

import com.github.kittinunf.fuel.Fuel
import com.github.kittinunf.fuel.coroutines.awaitByteArrayResponseResult
import io.tellery.entities.*
import mu.KLogger

interface IConnector {

    val logger: KLogger

    // will be initialized by reflection
    var importDispatcher: Map<String, ImportHandler>

    fun importSanityCheck(database: String, collection: String, schema: String?) // throw exceptions

    fun initByProfile(profile: ProfileEntity)

    suspend fun getCollections(dbName: String): List<CollectionField>

    suspend fun getDatabases(): List<String>

    suspend fun getCollectionSchema(
        dbName: String,
        collectionName: String,
        schemaName: String?,
    ): List<TypeField>

    suspend fun query(ctx: QueryContext, sendToChannel: suspend (QueryResultSet) -> Unit)

    suspend fun import(
        database: String,
        collection: String,
        schema: String?,
        url: String,
    ) {
        importSanityCheck(database, collection, schema)
        val (_, response, result) = Fuel.get(url).awaitByteArrayResponseResult()
        result.fold(success = { content ->
            val contentType = response.header("Content-Type").single()
            val handler =
                importDispatcher[contentType] ?: throw ImportNotSupportedException(contentType)
            handler(database, collection, schema, content)
        }, failure = { error ->
            logger.error { error }
            throw DownloadFailedException()
        })
    }
}

