package io.tellery.integrations

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.grpc.Status
import io.tellery.annotations.Config
import io.tellery.annotations.Integration
import io.tellery.connectors.annotations.Dbt
import io.tellery.entities.CustomizedException
import io.tellery.entities.ProfileEntity

@Integration(
    type = "dbt",
    configs = [
        Config(
            name = Dbt.DbtFields.GIT_URL,
            type = Config.ConfigType.STRING,
            description = "The git url of your dbt repository. The format should be: git://[endpoint]:[organization_name]/[repo_name].git.",
            hint = "",
            required = true
        ),
        Config(
            name = Dbt.DbtFields.DBT_PROJECT_NAME,
            type = Config.ConfigType.STRING,
            description = "The name of your dbt project, it should be equal with the name in dbt_project.yml.",
            hint = "",
            required = true
        ),
        Config(
            name = Dbt.DbtFields.PUBLIC_KEY,
            type = Config.ConfigType.STRING,
            description = "The public key generated by tellery for dbt repository, please copy it to the 'deploy key' in git server.",
            hint = "",
            required = false
        )
    ]
)
abstract class DbtIntegration : BaseIntegration() {

    companion object {
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
