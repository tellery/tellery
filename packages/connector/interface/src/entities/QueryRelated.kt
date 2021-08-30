package io.tellery.entities

data class QueryContext(
    val sql: String,
    val questionId: String?,
    val maxRows: Int,
)

data class TypeField(val name: String, val type: Int)

data class CollectionField(val collection: String, val schema: String?)

sealed class QueryResultSet {
    class Fields(val value: List<TypeField>) : QueryResultSet()
    class Rows(val value: List<Any>) : QueryResultSet()
    class Error(val value: Exception) : QueryResultSet()
}

typealias ImportHandler = suspend (database: String, collection: String, schema: String?, content: ByteArray) -> Unit
