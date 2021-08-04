package io.tellery.common.dbt.profile

data class Entity(val outputs: Output, val target: String = "dev") {
    data class Output(val dev: BaseProfile)
}
