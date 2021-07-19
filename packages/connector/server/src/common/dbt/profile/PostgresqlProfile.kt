package io.tellery.common.dbt.profile

import com.fasterxml.jackson.annotation.JsonInclude
import io.tellery.common.dbt.Constants

@JsonInclude(JsonInclude.Include.NON_NULL)
data class PostgresqlProfile(
    val host: String,
    val user: String,
    val password: String,
    val port: String
) : BaseProfile(
    type = Constants.PROFILE_PG_TYPE,
    schema = Constants.PROFILE_SCHEMA,
    database = null,
    warehouse = null,
    dbname = null
)