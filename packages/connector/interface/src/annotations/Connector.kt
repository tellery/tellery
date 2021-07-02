package io.tellery.annotations

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Connector(val type: String, val jdbcConfigs: Array<Config>, val optionals: Array<Config> = [])
