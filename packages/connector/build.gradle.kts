
allprojects{
    group = "io.tellery"
    version = "0.5.0"
    repositories {
        jcenter()
    }
    apply(plugin = "idea")
}

plugins {
    idea
    kotlin("jvm") apply false
}

idea {
    module {
        inheritOutputDirs = false
        outputDir = file("$buildDir/classes/kotlin/main")
        testOutputDir = file("$buildDir/classes/kotlin/test")
    }
}