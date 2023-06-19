import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

val coroutinesVersion: String by project
val logbackVersion: String by project
val grpcVersion: String by project
val jacksonVersion: String by project

// Version for releasing snapshot, should be the next version (one to be released)
val snapshotVersion = "0.8.6"

repositories {
    jcenter()
    maven("https://kotlin.bintray.com/kotlinx")
}

plugins {
    idea
    `java-library`
    kotlin("jvm")
    `maven-publish`
}

sourceSets.main {
    java.srcDirs("src")
    resources.srcDirs("resources")
}

sourceSets.test {
    java.srcDirs("test")
    resources.srcDirs("testresources")
}

dependencies {
    api(kotlin("stdlib-jdk8"))
    api(kotlin("reflect"))
    api("org.jetbrains.kotlinx:kotlinx-coroutines-core:$coroutinesVersion")

    api("ch.qos.logback:logback-classic:$logbackVersion")
    api("io.github.microutils:kotlin-logging:2.1.21")
    api("javax.annotation:javax.annotation-api:1.3.2")

    api("io.grpc:grpc-stub:$grpcVersion")

    api("com.zaxxer:HikariCP:4.0.3")
    api("com.michael-bull.kotlin-coroutines-jdbc:kotlin-coroutines-jdbc:1.0.2")

    api("com.aventrix.jnanoid:jnanoid:2.0.0")
    api("com.amazonaws:aws-java-sdk-s3:1.12.490")
    api("com.opencsv:opencsv:5.5.2")

    api("com.github.kittinunf.fuel:fuel:2.3.1")
    api("com.github.kittinunf.fuel:fuel-coroutines:2.3.1")

    api("com.fasterxml.jackson.module:jackson-module-kotlin:$jacksonVersion")
}

java {
    withSourcesJar()
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "1.8"
        freeCompilerArgs = freeCompilerArgs + "-Xopt-in=kotlin.RequiresOptIn"
    }
}

publishing {
    repositories {
        maven {
            name = "GithubPackages"
            url = uri("https://maven.pkg.github.com/tellery/tellery")
            credentials {
                username =
                    project.findProperty("gpr.user") as String? ?: System.getenv("GITHUB_USERNAME")
                password =
                    project.findProperty("gpr.key") as String? ?: System.getenv("GITHUB_TOKEN")
            }
        }
    }
    publications {
        create<MavenPublication>("maven") {
            groupId = project.group.toString()
            artifactId = "connector-interface"
            version = System.getenv("RELEASE_VERSION") ?: "$snapshotVersion-SNAPSHOT"
            from(components["java"])
        }
    }
}