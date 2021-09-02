package io.tellery.annotations

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Integration(val type: String, val configs: Array<Config>)