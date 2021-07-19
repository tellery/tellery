package io.tellery.utils

import java.security.KeyFactory
import java.security.PrivateKey
import java.security.spec.PKCS8EncodedKeySpec
import java.util.*


fun loadPrivateKey(keyContent: String): PrivateKey {
    val sanitizedKeyContent = keyContent
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace("\\s+".toRegex(), "")
    val keyFactory = KeyFactory.getInstance("RSA")
    val decodedBytes = Base64.getDecoder().decode(sanitizedKeyContent)
    return keyFactory.generatePrivate(PKCS8EncodedKeySpec(decodedBytes))
}

