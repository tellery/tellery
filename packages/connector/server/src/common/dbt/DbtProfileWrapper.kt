package io.tellery.common.dbt

import io.tellery.connectors.profiles.BaseDbtProfile


data class Entity(val outputs: Output, val target: String = "dev") {
    data class Output(val dev: BaseDbtProfile)
}
