package io.tellery.integrations

import io.tellery.connectors.fields.SnowflakeFields
import io.tellery.entities.NewProfile

@DbtIntegrationType("Snowflake")
class SnowflakeDbtIntegration : DbtIntegration() {

    override fun transformToDbtProfile(profile: NewProfile): BaseDbtProfile {
        val account = getValueOrThrowException(profile, SnowflakeFields.ACCOUNT_NAME)
        val region = getValueOrThrowException(profile, SnowflakeFields.REGION_ID)
        return SnowflakeDbtProfile(
            account = "$account.$region",
            user = getValueOrThrowException(profile, SnowflakeFields.USERNAME),
            password = getValueOrThrowException(profile, SnowflakeFields.PASSWORD),
            database = getValueOrThrowException(profile, SnowflakeFields.DATABASE),
            schema = getValueOrThrowException(profile, SnowflakeFields.SCHEMA),
            warehouse = getValueOrThrowException(profile, SnowflakeFields.WAREHOUSE)
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