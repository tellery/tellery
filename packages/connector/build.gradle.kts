allprojects {
    group = "io.tellery"
    version = "0.8.2"
    repositories {
        jcenter()
    }
    apply(plugin = "idea")
    apply(plugin = "com.github.ben-manes.versions")
    apply(plugin = "se.patrikerdes.use-latest-versions")
}

plugins {
    idea
    kotlin("jvm") apply false
    id("com.github.ben-manes.versions") version "0.39.0"
    id("se.patrikerdes.use-latest-versions") version "0.2.17"
}

idea {
    module {
        inheritOutputDirs = false
        outputDir = file("$buildDir/classes/kotlin/main")
        testOutputDir = file("$buildDir/classes/kotlin/test")
    }
}