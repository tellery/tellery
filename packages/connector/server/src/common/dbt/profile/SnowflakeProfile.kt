package io.tellery.common.dbt.profile

import com.fasterxml.jackson.annotation.JsonInclude
import io.tellery.common.dbt.Constants

@JsonInclude(JsonInclude.Include.NON_NULL)
data class SnowflakeProfile(
    val account: String,
    val user: String,
    val password: String
) : BaseProfile(
    type = Constants.PROFILE_SNOWFLAKE_TYPE,
    schema = Constants.PROFILE_SCHEMA,
    database = Constants.PROFILE_DATABASE,
    warehouse = Constants.PROFILE_WAREHOUSE,
    dbname = null
)