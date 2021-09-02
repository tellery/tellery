package annotations

import io.tellery.annotations.Config

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Integration(val type: String, val configs: Array<Config>)