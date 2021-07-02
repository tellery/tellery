rootProject.name = "tellery-connector"

include("interface", "implementation", "server")


pluginManagement {
    val kotlinVersion: String by settings
    plugins {
        kotlin("jvm") version kotlinVersion
        kotlin("kapt") version kotlinVersion
    }
}