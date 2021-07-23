package io.tellery.common.dbt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.google.common.base.Strings
import io.tellery.common.dbt.profile.*
import io.tellery.common.dbt.profile.Entity.Output
import io.tellery.entities.Profile
import io.tellery.services.Utils.assertInternalError

object ProfileManager {

    private val mapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule())

    fun batchToDbtProfile(profiles: List<Profile>): String {
        val profileMap = profiles
            .map { it.configs[Constants.PROFILE_DBT_PROJECT_FIELD] to Entity(Output(toDbtProfile(it))) }
            .toMap()
        return mapper.writeValueAsString(profileMap)
    }

    private fun toDbtProfile(profile: Profile): BaseProfile {
        val config = profile.configs
        val auth = profile.auth!!

        return when (profile.type) {
            "PostgreSQL" -> {
                assertConfigField(config, Constants.PG_ENDPOINT_FIELD)
                assertConfigField(config, Constants.PG_PORT_FIELD)
                assertConfigField(config, Constants.PG_DATABASE_FIELD)
                return PostgresqlProfile(
                    host = config[Constants.PG_ENDPOINT_FIELD]!!,
                    port = config[Constants.PG_PORT_FIELD]!!,
                    user = auth.username,
                    password = auth.password!!
                )
            }
            "Redshift" -> {
                assertConfigField(config, Constants.RS_ENDPOINT_FIELD)
                assertConfigField(config, Constants.RS_PORT_FIELD)
                assertConfigField(config, Constants.RS_DATABASE_FIELD)
                return RedshiftProfile(
                    host = config[Constants.RS_ENDPOINT_FIELD]!!,
                    port = config[Constants.RS_PORT_FIELD]!!,
                    user = auth.username,
                    password = auth.password!!
                )
            }
            "Snowflake" -> {
                assertConfigField(config, Constants.SF_ACCOUNT_FIELD)
                assertConfigField(config, Constants.SF_REGION_FIELD)
                return SnowflakeProfile(
                    account = "${config[Constants.SF_ACCOUNT_FIELD]}.${config[Constants.SF_REGION_FIELD]}",
                    user = auth.username,
                    password = auth.password!!
                )
            }
            else -> throw RuntimeException("The type is not supported now.")
        }
    }

    private fun assertConfigField(config: Map<String, String>, field: String) {
        assertInternalError(!Strings.isNullOrEmpty(config[field])) { "Required key $field is not in profile." }
    }
}
