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
    implementation(platform("com.google.cloud:libraries-bom:24.1.0"))
    implementation("net.snowflake:snowflake-jdbc:3.13.22")
    runtimeOnly("org.postgresql:postgresql:42.3.1")
    runtimeOnly("com.amazon.redshift:redshift-jdbc42:2.1.0.3")
    implementation("com.google.cloud:google-cloud-bigquery")
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "1.8"
    }
}
