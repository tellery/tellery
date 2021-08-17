package io.tellery.utils

import com.aventrix.jnanoid.jnanoid.NanoIdUtils
import java.security.MessageDigest
import java.util.*


private val alphabet = "346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz".toCharArray()

fun randomName(length: Int = 6): String {
    return NanoIdUtils.randomNanoId(Random(), alphabet, length)
}

fun String.sha256(): String {
    return MessageDigest
        .getInstance("SHA-256")
        .digest(this.toByteArray())
        .fold("") { str, it -> str + "%02x".format(it) }
}

fun ByteArray.toBase64(): String {
    return Base64.getEncoder().encodeToString(this)
}


fun buildOptionalsFromConfigs(configs: Map<String, String?>): String {
    val filteredConfigs = configs.filterValues { it != null }
    return if (filteredConfigs.isEmpty()) {
        ""
    } else {
        "?" + filteredConfigs.entries
            .joinToString("&") { (k, v) -> "$k=$v" }
    }
}
