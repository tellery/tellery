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
    implementation("net.snowflake:snowflake-jdbc:3.13.5")
    runtimeOnly("org.apache.hive:hive-jdbc:3.1.2") {
        exclude(group = "org.slf4j", module = "")
        exclude(group = "log4j", module = "log4j")
        exclude(group = "org.apache.logging.log4j", module = "")
    }
    runtimeOnly("org.postgresql:postgresql:42.2.22")
    runtimeOnly("com.amazon.redshift:redshift-jdbc42:2.0.0.3")
    runtimeOnly("com.facebook.presto:presto-jdbc:0.253")
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "1.8"
    }
}
