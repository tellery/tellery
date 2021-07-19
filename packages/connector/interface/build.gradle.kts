import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

val coroutinesVersion: String by project
val arrowVersion: String by project
val logbackVersion: String by project
val grpcVersion: String by project

repositories {
    jcenter()
    maven("https://dl.bintray.com/arrow-kt/arrow-kt/")
    maven("https://kotlin.bintray.com/kotlinx")
}

plugins {
    idea
    `java-library`
    kotlin("jvm")
    kotlin("kapt")
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
    api("io.github.microutils:kotlin-logging:2.0.10")
    api("javax.annotation:javax.annotation-api:1.3.2")

    api("io.arrow-kt:arrow-core:$arrowVersion")
    api("io.arrow-kt:arrow-syntax:$arrowVersion")
    kapt("io.arrow-kt:arrow-meta:$arrowVersion")

    api("io.grpc:grpc-stub:$grpcVersion")

    api("com.zaxxer:HikariCP:4.0.3")
    api("com.michael-bull.kotlin-coroutines-jdbc:kotlin-coroutines-jdbc:1.0.2")

    api("com.aventrix.jnanoid:jnanoid:2.0.0")
    api("com.amazonaws:aws-java-sdk-s3:1.12.18")
    api("com.github.doyaaaaaken:kotlin-csv-jvm:0.15.2")

    api("com.github.kittinunf.fuel:fuel:2.3.1")
    api("com.github.kittinunf.fuel:fuel-coroutines:2.3.1")
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
                username = project.findProperty("gpr.user") as String? ?: System.getenv("GITHUB_USERNAME")
                password = project.findProperty("gpr.key") as String? ?: System.getenv("GITHUB_TOKEN")
            }
        }
    }
    publications {
        create<MavenPublication>("maven"){
            groupId = project.group.toString()
            artifactId = "connector-interface"
            version = System.getenv("RELEASE_VERSION") ?: project.version.toString() + "-SNAPSHOT"
            from(components["java"])
        }
    }
}