package io.tellery.utils

import java.io.ByteArrayInputStream
import java.io.InputStream
import java.math.BigDecimal
import java.sql.Date
import java.sql.PreparedStatement
import java.sql.Timestamp
import java.sql.Types
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.util.*

val SQLTypeValueMap =
    Types::class.members.filter { it.isFinal }.associate { it.call() as Int to it.name }

fun toSQLType(type: Int): String {
    return SQLTypeValueMap[type] ?: "Unknown"
}

fun PreparedStatement.setByType(index: Int, sqlType: Int, value: String?) {
    // the case that value itself is null corresponds to empty entry in csv
    value?.let {
        fun <T> setHelper(caster: (String) -> T, setter: PreparedStatement.(Int, T) -> Unit) {
            return this.setter(index, caster(value))
        }
        when (sqlType) {
            Types.INTEGER -> setHelper(::castToInt, PreparedStatement::setInt)
            Types.BIGINT -> setHelper(::castToBigDecimal, PreparedStatement::setBigDecimal)
            Types.BOOLEAN -> setHelper(::castToBoolean, PreparedStatement::setBoolean)
            Types.BLOB -> setHelper(::decodeFromBase64, PreparedStatement::setBlob)
            Types.VARBINARY -> setHelper(::decodeFromBase64, PreparedStatement::setBinaryStream)
            Types.DECIMAL -> setHelper(::castToDouble, PreparedStatement::setDouble)
            Types.FLOAT -> setHelper(::castToFloat, PreparedStatement::setFloat)
            Types.DATE -> setHelper(::castToDate, PreparedStatement::setDate)
            Types.TIMESTAMP -> setHelper(::castToTimestamp, PreparedStatement::setTimestamp)
            else -> this.setString(index, value)
        }
    } ?: this.setNull(index, sqlType)
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
    return s.lowercase() == "true"
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
    return (Date.from(localDate.atStartOfDay(ZoneId.systemDefault()).toInstant()) as Date)
}
