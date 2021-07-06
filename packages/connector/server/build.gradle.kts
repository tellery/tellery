import org.jetbrains.kotlin.gradle.tasks.KotlinCompile
import com.google.protobuf.gradle.*

val className = "io.tellery.MainKt"

val krotoplusVersion: String by project
val grpcVersion: String by project
val protobufVersion: String by project
val nattytcnativeVersion: String by project

repositories {
    jcenter()
    maven("https://jitpack.io")
}

plugins {
	application
    kotlin("jvm")
    id("com.google.protobuf") version "0.8.16"
    id("com.github.marcoferrer.kroto-plus") version "0.6.1"
    id("com.google.cloud.tools.jib") version "3.1.1"
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

    implementation("com.google.code.gson:gson:2.8.7")

    implementation("io.grpc:grpc-protobuf:$grpcVersion")
    implementation("io.grpc:grpc-stub:$grpcVersion")
    implementation("io.grpc:grpc-netty-shaded:$grpcVersion")

    runtimeOnly("io.netty:netty-tcnative-boringssl-static:$nattytcnativeVersion")

    implementation("com.github.marcoferrer.krotoplus:kroto-plus-coroutines:$krotoplusVersion")
    implementation("com.github.marcoferrer.krotoplus:kroto-plus-message:$krotoplusVersion")
    implementation("com.github.marcoferrer.krotoplus:kroto-plus-test:$krotoplusVersion")
    implementation("com.google.protobuf:protobuf-java:$protobufVersion")

    implementation("com.github.vishna:watchservice-ktx:master-SNAPSHOT")
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
    classpath += files("${rootProject.projectDir}/extra/*")
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

jib {
    from {
        image = "openjdk:8-jre-alpine"
    }
    container {
        appRoot = "/usr/app"
        containerizingMode = "packaged"
        workingDirectory = "/usr/app"
        extraClasspath = listOf("/usr/app/extra/*")
        jvmFlags = listOf(
            "-server",
            "-Djava.awt.headless=true",
            "-javaagent:/usr/app/libs/kotlinx-coroutines-core-jvm-1.3.9.jar",
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
