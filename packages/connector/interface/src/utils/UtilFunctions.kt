package io.tellery.utils

import com.aventrix.jnanoid.jnanoid.NanoIdUtils
import java.security.KeyFactory
import java.security.MessageDigest
import java.security.PrivateKey
import java.security.spec.PKCS8EncodedKeySpec
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


fun buildOptionalsFromConfigs(configs: Map<String, String>): String {
    return if (configs.isEmpty()){
        ""
    }else {
        "?" + configs.entries.joinToString("&") { (k, v) -> "$k=$v"}
    }
}
