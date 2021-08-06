package io.tellery.common.dbt

object Constants {
    const val PROFILE_GIT_URL_FIELD: String = "Git Url"
    const val PROFILE_DBT_PROJECT_FIELD: String = "Dbt Project Name"

    val EXTERNAL_CONFIG_FIELDS: List<String> =
        listOf(PROFILE_GIT_URL_FIELD, PROFILE_DBT_PROJECT_FIELD)
}
