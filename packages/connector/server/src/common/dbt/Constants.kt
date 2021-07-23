package io.tellery.common.dbt

import com.google.common.collect.ImmutableList

object Constants {
    const val PROFILE_PG_TYPE = "postgres"
    const val PROFILE_REDSHIFT_TYPE = "redshift"
    const val PROFILE_SNOWFLAKE_TYPE = "snowflake"

    const val PROFILE_DATABASE: String = "tellery_database"
    const val PROFILE_WAREHOUSE: String = "tellery_warehouse"
    const val PROFILE_DBNAME: String = "tellery_dbname"
    const val PROFILE_SCHEMA: String = "tellery_schema"

    const val PROFILE_GIT_URL_FIELD: String = "GitUrl"
    const val PROFILE_DBT_PROJECT_FIELD: String = "DbtProjectName"

    const val PG_ENDPOINT_FIELD: String = "Endpoint"
    const val PG_PORT_FIELD: String = "Port"
    const val PG_DATABASE_FIELD: String = "Database"
    const val PG_USERNAME_FIELD: String = "Username"
    const val PG_PASSWORD_FIELD: String = "Password"

    const val RS_ENDPOINT_FIELD: String = "Endpoint"
    const val RS_PORT_FIELD: String = "Port"
    const val RS_DATABASE_FIELD: String = "Database"
    const val RS_USERNAME_FIELD: String = "Username"
    const val RS_PASSWORD_FIELD: String = "Password"

    const val SF_ACCOUNT_FIELD: String = "Account Name"
    const val SF_REGION_FIELD: String = "Region Id"
    const val SF_USERNAME_FIELD: String = "Username"
    const val SF_PASSWORD_FIELD: String = "Password"

    val EXTERNAL_CONFIG_FIELDS: List<String> =
        ImmutableList.of(PROFILE_GIT_URL_FIELD, PROFILE_DBT_PROJECT_FIELD)
}