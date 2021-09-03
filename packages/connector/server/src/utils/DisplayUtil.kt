package io.tellery.utils

import io.tellery.grpc.DisplayType

import com.google.gson.JsonElement
import com.google.gson.JsonPrimitive
import com.google.gson.JsonSerializationContext
import com.google.gson.JsonSerializer
import java.lang.reflect.Type
import java.sql.Time
import java.sql.Timestamp

import java.sql.Types
import java.util.*

fun toDisplayType(type: Int): DisplayType {
    return when (type) {
        Types.TINYINT, Types.SMALLINT, Types.INTEGER -> DisplayType.INT
        Types.BIGINT -> DisplayType.BIGINT
        Types.BIT, Types.BOOLEAN -> DisplayType.BOOLEAN
        Types.CLOB, Types.BLOB -> DisplayType.BLOB
        Types.BINARY, Types.VARBINARY, Types.LONGVARBINARY -> DisplayType.BYTES
        Types.FLOAT, Types.REAL, Types.DOUBLE, Types.NUMERIC, Types.DECIMAL -> DisplayType.FLOAT
        Types.CHAR, Types.VARCHAR, Types.LONGVARCHAR -> DisplayType.STRING
        Types.TIMESTAMP, Types.TIMESTAMP_WITH_TIMEZONE -> DisplayType.DATETIME
        Types.TIME -> DisplayType.TIME
        Types.DATE -> DisplayType.DATE
        Types.STRUCT -> DisplayType.STRUCT
        Types.ARRAY -> DisplayType.ARRAY
        else -> DisplayType.UNKNOWN
    }
}


class TimestampSerializer : JsonSerializer<Date> {
    override fun serialize(ts: Date, typeOf: Type?, ctx: JsonSerializationContext?): JsonElement {
        return JsonPrimitive(ts.time)
    }
}
