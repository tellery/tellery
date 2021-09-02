package io.tellery.annotations

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
// TODO: add credential to Connector?
annotation class Connector(val type: String, val configs: Array<Config>)
