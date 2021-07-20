package io.tellery.common

import com.github.kittinunf.fuel.*
import com.github.kittinunf.fuel.core.*
import kotlinx.coroutines.*
import mu.*
import java.io.*
import java.net.*
import java.nio.file.*
import kotlin.io.path.*


object DriverLoader {
    private val logger = KotlinLogging.logger { }

    init {
        val driverFolder = File("drivers")
        if (!driverFolder.exists()) {
            driverFolder.mkdirs()
        }
    }

    @OptIn(ExperimentalPathApi::class)
    suspend fun loadJar(jarName: String) {
        val (groupId, artifactId, version) = jarName.split(":")
        val jar = Jar(groupId, artifactId, version)
        val file = Path("drivers/${jar.filename}")
        if (!file.exists()) {
            file.createFile()
            downloadJar(jar)
        }
        addJarToClasspath(file)
    }

    @OptIn(ExperimentalPathApi::class)
    private fun addJarToClasspath(jar: Path) {
        val url = jar.toUri().toURL()
        val classLoader = ClassLoader.getSystemClassLoader() as URLClassLoader
        val method = classLoader.javaClass.superclass.getDeclaredMethod("addURL", URL::class.java)
        method.isAccessible = true
        method.invoke(classLoader, url)
    }

    @OptIn(ExperimentalPathApi::class)
    private suspend fun downloadJar(jar: Jar): Unit = withContext(Dispatchers.IO) {
        logger.info("Downloading jar: {}", jar)
        val lockFile = Path("drivers/${jar.filename}.lock")
        if (lockFile.notExists()) {
            lockFile.createFile()
        }
        val fchannel = lockFile.toFile().outputStream().channel
        val lock = fchannel.lock()
        try {
            if (Path("drivers/${jar.filename}").notExists()) {
                withTimeout(5 * 60 * 1000L) {
                    ConfigManager.repos.forEach { repoUrl ->
                        try {
                            Fuel.download(jar.toRepoUrl(repoUrl), Method.GET)
                                .also { it.allowRedirects(true) }
                                .fileDestination { _, _ -> File("drivers/${jar.filename}") }
                                .await(
                                    object : ResponseDeserializable<Unit> {
                                        override fun deserialize(response: Response) {
                                            logger.info("Downloaded ${jar.filename}!")
                                        }
                                    }
                                )
                            // breaks the loop and return
                            return@withTimeout
                        } catch (e: FuelError) {
                            logger.warn("download ${jar.filename} failed at repo:", e)
                            // continue
                            return@forEach
                        }
                    }
                    throw Exception("Download driver failed: ${jar.filename}")
                }
            }
        } finally {
            lock?.release()
            lockFile.deleteIfExists()
            fchannel?.close()
        }
    }

    data class Jar(
        val groupId: String,
        val artifactId: String,
        val version: String,
    ) {
        val filename: String
            get() = "${artifactId}-${version}.jar"

        fun toRepoUrl(repo: String): String {
            return arrayOf(
                repo,
                groupId.replace('.', '/'),
                artifactId,
                version.split("-")[0],
                filename,
            ).joinToString("/")
        }

        override fun toString(): String {
            return "${groupId}:${artifactId}:${version}"
        }
    }
}
