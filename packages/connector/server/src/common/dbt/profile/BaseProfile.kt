package io.tellery.common.dbt.profile

import com.fasterxml.jackson.annotation.JsonInclude

@JsonInclude(JsonInclude.Include.NON_NULL)
open class BaseProfile(
    val type: String,
    val schema: String,
    open val database: String?,
    val warehouse: String?,
    val dbname: String?
)
