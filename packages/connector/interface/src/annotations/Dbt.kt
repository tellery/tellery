package io.tellery.connectors.annotations

import io.tellery.annotations.Config

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Dbt(val type: String, val configs: Array<Config>)
