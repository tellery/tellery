package io.tellery.entities

data class QueryContext(
    val sql: String,
    val questionId: String?,
    val maxRows: Int,
)

