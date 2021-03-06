package io.tellery.integrations

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.grpc.Status
import io.tellery.annotations.Config
import io.tellery.annotations.Integration
import io.tellery.entities.CustomizedException
import io.tellery.entities.ProfileEntity
import io.tellery.integrations.DbtIntegration.Companion.DBT_PROJECT_FIELD
import io.tellery.integrations.DbtIntegration.Companion.GIT_URL_FIELD
import io.tellery.integrations.DbtIntegration.Companion.PUBLIC_KEY_FIELD

@Integration(
    type = "dbt",
    configs = [
        Config(
            name = GIT_URL_FIELD,
            type = Config.ConfigType.STRING,
            description = "The git url of your dbt repository. The format should be: git://[endpoint]:[organization_name]/[repo_name].git.",
            hint = "",
            required = true
        ),
        Config(
            name = DBT_PROJECT_FIELD,
            type = Config.ConfigType.STRING,
            description = "The name of your dbt project, it should be equal with the name in dbt_project.yml.",
            hint = "",
            required = true
        ),
        Config(
            name = PUBLIC_KEY_FIELD,
            type = Config.ConfigType.STRING,
            description = "The public key generated by tellery for dbt repository, please copy it to the 'deploy key' in git server.",
            hint = "",
            required = false
        )
    ]
)
abstract class DbtIntegration : BaseIntegration() {

    companion object {
        const val GIT_URL_FIELD = "Git Url"
        const val PUBLIC_KEY_FIELD = "Public Key"
        const val DBT_PROJECT_FIELD = "Dbt Project Name"

        val mapper = jacksonObjectMapper()
    }

    protected fun getValueOrThrowException(profileEntity: ProfileEntity, key: String): String {
        return profileEntity.configs[key] ?: throw DbtMissRequiredKey(key, profileEntity.type)
    }

    open fun transformToDbtProfile(profileEntity: ProfileEntity): BaseDbtProfile {
        throw NotImplementedError("The dbt integration is not impl transformToDbtProfile method.")
    }
}

@JsonInclude(JsonInclude.Include.NON_NULL)
open class BaseDbtProfile(open val type: String)

annotation class DbtIntegrationType(val value: String)

class DbtMissRequiredKey(key: String, type: String) :
    CustomizedException(
        "Required key $key is not in $type dataset profile.",
        Status.FAILED_PRECONDITION
    )
