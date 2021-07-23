package io.tellery.common.dbt.model

import com.fasterxml.jackson.annotation.JsonIgnoreProperties

@JsonIgnoreProperties(ignoreUnknown = true)
data class Manifest(
    val nodes: Map<String, DbtModel>,
    val sources: Map<String, DbtModel>
)
