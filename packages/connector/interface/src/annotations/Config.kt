package io.tellery.annotations

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
annotation class Config(
    val name: String,
    val type: ConfigType,
    val description: String = "",
    val hint: String = "",
    val required: Boolean = false,
    val secret: Boolean = false,
){
    enum class ConfigType {
        STRING,
        NUMBER,
        BOOLEAN,
        FILE,         // Content will be encoded by base64
    }
}
