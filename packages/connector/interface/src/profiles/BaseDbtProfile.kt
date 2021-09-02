package io.tellery.connectors.profiles

import io.tellery.entities.Profile

@Deprecated("")
open class BaseDbtProfile {

    open lateinit var type: String

    protected fun getValueOrThrowException(profile: Profile, key: String): String {
        return profile.configs[key]
            ?: throw RuntimeException("Required key $key is not in ${profile.type} dataset profile.")
    }
}
