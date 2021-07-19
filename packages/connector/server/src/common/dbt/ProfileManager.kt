package io.tellery.common.dbt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.google.common.base.Strings
import io.tellery.common.dbt.profile.*
import io.tellery.common.dbt.profile.Entity.Output
import io.tellery.entities.Profile

object ProfileManager {

    private val mapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule())

    fun batchToDbtProfile(profiles: List<Profile>): String {
        val profileMap = profiles
            .map { it.name to Entity(Output(toDbtProfile(it))) }
            .toMap()
        return mapper.writeValueAsString(profileMap)
    }

    private fun toDbtProfile(profile: Profile): BaseProfile {
        val config = profile.configs

        return when (profile.type) {
            "PostgreSQL" -> {
                assert(!Strings.isNullOrEmpty(config[Constants.PG_ENDPOINT_FIELD]))
                assert(!Strings.isNullOrEmpty(config[Constants.PG_PORT_FIELD]))
                assert(!Strings.isNullOrEmpty(config[Constants.PG_DATABASE_FIELD]))
                return PostgresqlProfile(
                    host = config[Constants.PG_ENDPOINT_FIELD]!!,
                    port = config[Constants.PG_PORT_FIELD]!!,
                    user = profile.auth!!.username,
                    password = profile.auth!!.password!!
                )
            }
            "Redshift" -> {
                assert(!Strings.isNullOrEmpty(config[Constants.RS_ENDPOINT_FIELD]))
                assert(!Strings.isNullOrEmpty(config[Constants.RS_PORT_FIELD]))
                assert(!Strings.isNullOrEmpty(config[Constants.RS_DATABASE_FIELD]))
                return RedshiftProfile(
                    host = config[Constants.RS_ENDPOINT_FIELD]!!,
                    port = config[Constants.RS_PORT_FIELD]!!,
                    user = profile.auth!!.username,
                    password = profile.auth!!.password!!
                )
            }
            "Snowflake" -> {
                assert(!Strings.isNullOrEmpty(config[Constants.SF_ACCOUNT_FIELD]))
                assert(!Strings.isNullOrEmpty(config[Constants.SF_REGION_FIELD]))
                return SnowflakeProfile(
                    account = "${config[Constants.SF_ACCOUNT_FIELD]}.${config[Constants.SF_REGION_FIELD]}",
                    user = profile.auth!!.username,
                    password = profile.auth!!.password!!
                )
            }
            else -> throw RuntimeException("The type is not supported now.")
        }
    }
}
