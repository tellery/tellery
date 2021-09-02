package io.tellery.integrations

import io.tellery.connectors.fields.SnowflakeFields
import io.tellery.entities.ProfileEntity

@DbtIntegrationType("Snowflake")
class SnowflakeDbtIntegration : DbtIntegration() {

    override fun transformToDbtProfile(profileEntity: ProfileEntity): BaseDbtProfile {
        val account = getValueOrThrowException(profileEntity, SnowflakeFields.ACCOUNT_NAME)
        val region = getValueOrThrowException(profileEntity, SnowflakeFields.REGION_ID)
        return SnowflakeDbtProfile(
            account = "$account.$region",
            user = getValueOrThrowException(profileEntity, SnowflakeFields.USERNAME),
            password = getValueOrThrowException(profileEntity, SnowflakeFields.PASSWORD),
            database = getValueOrThrowException(profileEntity, SnowflakeFields.DATABASE),
            schema = getValueOrThrowException(profileEntity, SnowflakeFields.SCHEMA),
            warehouse = getValueOrThrowException(profileEntity, SnowflakeFields.WAREHOUSE)
        )
    }

    class SnowflakeDbtProfile(
        val account: String,
        val user: String,
        val password: String,
        val database: String,
        val schema: String,
        val warehouse: String
    ) : BaseDbtProfile("snowflake")
}