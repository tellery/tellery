package io.tellery.connectors.profiles

import io.tellery.entities.Profile

open class BaseDbtProfile(profile: Profile) {

    open lateinit var type: String
    open var dbname: String = "tellery_dbname"
    open var warehouse: String = "tellery_warehouse"
    open var schema: String = "tellery_schema"

    protected fun getValueOrThrowException(profile: Profile, key: String): String {
        return profile.configs[key]
            ?: throw RuntimeException("Required key $key is not in ${profile.type} dataset profile.")
    }
}
