import com.google.protobuf.gradle.*
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

val className = "io.tellery.MainKt"

val krotoplusVersion: String by project
val grpcVersion: String by project
val protobufVersion: String by project
val nattytcnativeVersion: String by project
val coroutinesVersion: String by project
val jacksonVersion: String by project
val jgitVersion: String by project
val kotestVersion: String by project
val koinVersion: String by project
val ktormVersion: String by project
val testContainerVersion: String by project
val mockkVersion: String by project

repositories {
    jcenter()
    maven("https://jitpack.io")
}

plugins {
    application
    kotlin("jvm")
    id("com.google.protobuf") version "0.8.17"
    id("com.github.marcoferrer.kroto-plus") version "0.6.1"
    id("com.google.cloud.tools.jib") version "3.1.4"
}

application {
    mainClass.set(className)
}

sourceSets.main {
    proto.srcDirs("${rootProject.projectDir}/../protobufs")
    java.srcDirs("src")
    resources.srcDirs("resources")
}

sourceSets.test {
    java.srcDirs("test")
    resources.srcDirs("testresources")
}

dependencies {
    implementation(project(":interface"))
    implementation(project(":implementation"))

    implementation("org.reflections:reflections:0.9.12")
    implementation("com.typesafe:config:1.4.1")

    implementation("com.google.code.gson:gson:2.8.8")

    implementation("io.grpc:grpc-protobuf:$grpcVersion")
    implementation("io.grpc:grpc-stub:$grpcVersion")
    implementation("io.grpc:grpc-netty-shaded:$grpcVersion")
    implementation("io.grpc:grpc-services:$grpcVersion")

    runtimeOnly("io.netty:netty-tcnative-boringssl-static:$nattytcnativeVersion")

    implementation("com.github.marcoferrer.krotoplus:kroto-plus-coroutines:$krotoplusVersion")
    implementation("com.github.marcoferrer.krotoplus:kroto-plus-message:$krotoplusVersion")
    implementation("com.github.marcoferrer.krotoplus:kroto-plus-test:$krotoplusVersion")
    implementation("com.google.protobuf:protobuf-java:$protobufVersion")
    implementation("com.google.protobuf:protobuf-java-util:$protobufVersion")
    implementation("org.eclipse.jgit:org.eclipse.jgit:$jgitVersion")
    implementation("org.eclipse.jgit:org.eclipse.jgit.ssh.apache:$jgitVersion")
    implementation("org.eclipse.jgit:org.eclipse.jgit.ssh.jsch:$jgitVersion")
    implementation("com.jcraft:jsch:0.1.55")
    implementation("commons-io:commons-io:2.11.0")

    implementation("com.fasterxml.jackson.module:jackson-module-kotlin:$jacksonVersion")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:$jacksonVersion")

    implementation("org.koin:koin-core:$koinVersion")
    implementation("org.ktorm:ktorm-core:$ktormVersion")
    implementation("org.ktorm:ktorm-support-postgresql:$ktormVersion")

    testImplementation("io.kotest:kotest-runner-junit5:$kotestVersion")
    testImplementation("io.kotest:kotest-assertions-core:$kotestVersion")
    testImplementation("io.kotest:kotest-property:$kotestVersion")
    testImplementation("io.kotest:kotest-framework-datatest:$kotestVersion")
    testImplementation("io.kotest.extensions:kotest-extensions-testcontainers:1.0.1")
    testImplementation("io.mockk:mockk:$mockkVersion")
    testImplementation("org.testcontainers:postgresql:$testContainerVersion")
}


protobuf {
    protoc {
        artifact = "com.google.protobuf:protoc:$protobufVersion"
    }

    plugins {
        id("grpc") {
            artifact = "io.grpc:protoc-gen-grpc-java:$grpcVersion"
        }
        id("kroto") {
            artifact = "com.github.marcoferrer.krotoplus:protoc-gen-kroto-plus:$krotoplusVersion"
        }
    }

    generateProtoTasks {
        val krotoConfig = file("krotoPlusConfig.json")

        all().forEach { task ->
            task.inputs.files(krotoConfig)
            task.plugins {
                id("grpc") {
                    outputSubDir = "java"
                }
                id("kroto") {
                    outputSubDir = "java"
                    option("ConfigPath=$krotoConfig")
                }
            }
        }
    }
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        jvmTarget = "1.8"
        freeCompilerArgs = freeCompilerArgs + "-Xopt-in=kotlin.RequiresOptIn"
    }
}

tasks.withType<JavaExec> {
    workingDir = rootProject.projectDir
    classpath += files("${rootProject.projectDir}/extra/libs/*")
}

tasks.withType<Jar> {
    manifest {
        attributes(
            mapOf(
                "Main-Class" to className
            )
        )
    }
}

tasks.test {
    useJUnitPlatform()
    testLogging {
        events("passed", "skipped", "failed")
    }
}

jib {
    from {
        image = "tellery/jdk8-dbt:0.20.0"
    }
    container {
        appRoot = "/usr/app"
        containerizingMode = "packaged"
        workingDirectory = "/usr/app"
        extraClasspath = listOf("/usr/app/extra/libs/*")
        jvmFlags = listOf(
            "-server",
            "-Djava.awt.headless=true",
            "-javaagent:/usr/app/libs/kotlinx-coroutines-core-jvm-${coroutinesVersion}.jar",
            "-XX:+UnlockExperimentalVMOptions",
            "-XX:+UseCGroupMemoryLimitForHeap",
            "-XX:InitialRAMFraction=2",
            "-XX:MinRAMFraction=2",
            "-XX:MaxRAMFraction=2",
            "-XX:+UseG1GC",
            "-XX:MaxGCPauseMillis=100",
            "-XX:+UseStringDeduplication"
        )
        mainClass = className
        ports = listOf("50051")
    }
}
