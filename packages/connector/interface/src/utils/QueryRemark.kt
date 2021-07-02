package io.tellery.utils

import io.tellery.entities.QueryContext
import io.tellery.interfaces.IConnector


fun IConnector.queryRemark(context: QueryContext): String {
    val remark = if (context.questionId != null) {
        mapOf(
            "queryType" to "question",
            "questionId" to context.questionId,
        )
    } else {
        mapOf(
            "queryType" to "adhoc"
        )
    }
    return queryRemark(remark, context.sql)
}

fun IConnector.queryRemark(kvMap: Map<String, String>, sql: String): String {
    val leadingStr = kvMap.entries.joinToString("; ", transform = { (k, v) -> "$k:$v" })
    return "-- Tellery:: ${leadingStr}; queryHash:${sql.sha256()}\n${sql}"
}
