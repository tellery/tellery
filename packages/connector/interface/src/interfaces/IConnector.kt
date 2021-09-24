package io.tellery.interfaces

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
        contentType: String,
        body: ByteArray
    )

}

