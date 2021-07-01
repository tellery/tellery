package io.tellery.utils

import java.io.ByteArrayInputStream
import java.io.InputStream
import java.math.BigDecimal
import java.sql.PreparedStatement
import java.sql.Timestamp
import java.sql.Date
import java.sql.Types
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.*

val SQLTypeValueMap =
    Types::class.members.filter { it.isFinal }.associate { Pair(it.call() as Int, it.name) }

fun toSQLType(type: Int): String {
    return SQLTypeValueMap[type] ?: "Unknown"
}

fun PreparedStatement.setByType(index: Int, sqlType: Int, value: String) {
    when (sqlType) {
        Types.INTEGER -> this.setInt(index, castToInt(value))
        Types.BIGINT -> this.setBigDecimal(index, castToBigDecimal(value))
        Types.BOOLEAN -> this.setBoolean(index, castToBoolean(value))
        Types.BLOB -> this.setBlob(index, decodeFromBase64(value))
        Types.VARBINARY -> this.setBinaryStream(index, decodeFromBase64(value))
        Types.DECIMAL -> this.setDouble(index, castToDouble(value))
        Types.FLOAT -> this.setFloat(index, castToFloat(value))
        Types.VARCHAR -> this.setString(index, value)
        Types.DATE -> this.setDate(index, castToDate(value))
        Types.TIMESTAMP -> this.setTimestamp(index, castToTimestamp(value))
        else -> this.setString(index, value)
    }
}

fun castToInt(s: String): Int {
    return s.toIntOrNull() ?: s.toDouble().toInt()
}

fun castToFloat(s: String): Float {
    return s.toFloat()
}

fun castToDouble(s: String): Double {
    return s.toDouble()
}

fun castToBoolean(s: String): Boolean {
    return s.toLowerCase() == "true"
}

fun castToBigDecimal(s: String): BigDecimal {
    return s.substring(0, s.indexOf('.')).toBigDecimal()
}

fun decodeFromBase64(s: String): InputStream {
    return ByteArrayInputStream(Base64.getDecoder().decode(s))
}

fun castToLong(s: String): Long {
    return s.substring(0, s.indexOf('.')).toLong()
}


fun castToTimestamp(s: String): Timestamp {
    // s maybe long or datetime repr
    return try {
        val localDatetime = LocalDateTime.parse(s, formatter)
        val offset = ZoneId.systemDefault().rules.getOffset(localDatetime)
        Timestamp(localDatetime.toInstant(offset).toEpochMilli())
    } catch (e: DateTimeParseException) {
        Timestamp(castToLong(s))
    }
}
val formatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd[ HH:mm:ss[.SSS]][ zzz]")
fun castToDate(s: String): Date {
    val localDate = LocalDate.parse(s, formatter)
    return (Date.from(localDate.atStartOfDay(ZoneId.systemDefault()).toInstant()) as java.sql.Date)
}
