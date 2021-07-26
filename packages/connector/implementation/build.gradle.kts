import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

group = "io.tellery.connectors"

sourceSets.main {
    java.srcDirs("src")
    resources.srcDirs("resources")
}

sourceSets.test {
    java.srcDirs("test")
    resources.srcDirs("testresources")
}

repositories {
    jcenter()
    maven("https://s3.amazonaws.com/redshift-maven-repository/release")
}

plugins {
    idea
    kotlin("jvm")
}

dependencies {
    implementation(project(":interface"))
    implementation(platform("com.google.cloud:libraries-bom:20.9.0"))
    implementation("net.snowflake:snowflake-jdbc:3.13.5")
    runtimeOnly("org.postgresql:postgresql:42.2.23")
    runtimeOnly("com.amazon.redshift:redshift-jdbc42:2.0.0.6")
    implementation("com.google.cloud:google-cloud-bigquery")
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "1.8"
    }
}
