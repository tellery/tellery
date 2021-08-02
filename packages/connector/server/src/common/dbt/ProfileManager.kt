package io.tellery.common.dbt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import io.tellery.common.dbt.DbtManager.isDbtProfile
import io.tellery.common.dbt.profile.*
import io.tellery.common.dbt.profile.Entity.Output
import io.tellery.entities.Profile

object ProfileManager {

    private val mapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())

    fun batchToDbtProfile(profiles: List<Profile>): String {
        val profileMap = profiles
            .filter { isDbtProfile(it) }
            .associate {
                it.configs[Constants.PROFILE_DBT_PROJECT_FIELD] to Entity(
                    Output(toDbtProfile(it))
                )
            }
        return mapper.writeValueAsString(profileMap)
    }

    private fun toDbtProfile(profile: Profile): BaseProfile {
        when (profile.type) {
            "PostgreSQL" -> {
                return PostgresqlProfile(
                    host = getValueOrThrowException(profile, Constants.PG_ENDPOINT_FIELD),
                    port = getValueOrThrowException(profile, Constants.PG_PORT_FIELD),
                    user = getValueOrThrowException(profile, Constants.PG_USERNAME_FIELD),
                    password = getValueOrThrowException(profile, Constants.PG_PASSWORD_FIELD)
                )
            }
            "Redshift" -> {
                return RedshiftProfile(
                    host = getValueOrThrowException(profile, Constants.RS_ENDPOINT_FIELD),
                    port = getValueOrThrowException(profile, Constants.RS_PORT_FIELD),
                    user = getValueOrThrowException(profile, Constants.RS_USERNAME_FIELD),
                    password = getValueOrThrowException(profile, Constants.RS_PASSWORD_FIELD)
                )
            }
            "Snowflake" -> {
                val account = getValueOrThrowException(profile, Constants.SF_ACCOUNT_FIELD)
                val region = getValueOrThrowException(profile, Constants.SF_REGION_FIELD)
                return SnowflakeProfile(
                    account = "$account.$region",
                    user = getValueOrThrowException(profile, Constants.SF_USERNAME_FIELD),
                    password = getValueOrThrowException(profile, Constants.SF_PASSWORD_FIELD)
                )
            }
            else -> throw RuntimeException("The type is not supported now.")
        }
    }

    private fun getValueOrThrowException(profile: Profile, key: String): String {
        return profile.configs[key]
            ?: throw RuntimeException("Required key $key is not in ${profile.type} dataset profile.")
    }
}
