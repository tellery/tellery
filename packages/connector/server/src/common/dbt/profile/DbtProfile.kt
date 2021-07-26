package io.tellery.common.dbt.profile

data class Entity(val output: Output, val target: String = "dev") {
    data class Output(val dev: BaseProfile)
}
