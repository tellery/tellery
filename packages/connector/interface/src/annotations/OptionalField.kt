package io.tellery.annotations

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Optionals(
    val fields: Array<OptionalField>,
)

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class OptionalField(
    val name: String,
    val isSecret: Boolean = false,
)
