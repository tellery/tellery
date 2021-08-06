package io.tellery.connectors.profiles

import com.fasterxml.jackson.annotation.JsonInclude
import io.tellery.connectors.annotations.Dbt
import io.tellery.connectors.fields.SnowflakeFields
import io.tellery.entities.Profile

@JsonInclude(JsonInclude.Include.NON_NULL)
@Dbt(type = "Snowflake")
class SnowflakeDbtProfile(profile: Profile) : BaseDbtProfile(profile) {

    val account: String
    val user: String
    val password: String

    init {
        this.type = "snowflake"
        val account = getValueOrThrowException(profile, SnowflakeFields.ACCOUNT_NAME)
        val region = getValueOrThrowException(profile, SnowflakeFields.REGION_ID)
        this.account = "$account.$region"
        this.user = getValueOrThrowException(profile, SnowflakeFields.USERNAME)
        this.password = getValueOrThrowException(profile, SnowflakeFields.PASSWORD)
    }
}