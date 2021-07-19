package io.tellery.common

import com.google.gson.*
import com.google.gson.reflect.*
import com.typesafe.config.*
import io.tellery.entities.*
import kotlinx.coroutines.*
import java.io.*
import java.nio.channels.*

@OptIn(ExperimentalCoroutinesApi::class)
object ConfigManager {

    private val dbConfigPath: String
    private var config: ConnectorConfig
    private val registeredUpdateHandler: MutableList<suspend (Profile) -> Unit> = mutableListOf()
    private val registeredDeleteHandler: MutableList<suspend (String) -> Unit> = mutableListOf()

    init {
        val appConfig = ConfigFactory.load()
        dbConfigPath = appConfig.getString("dbProfile.path") ?: throw DBProfileNotConfiguredException()
        config = loadConfig()
    }

    val profiles: List<Profile>
        get() = config.profiles

    val credential: Credential?
        get() = config.credential

    val repos: List<String>
        get() = (if (config.repo.isNullOrEmpty()) listOf("https://repo1.maven.org/maven2/") else config.repo!!).map {
            it.trimEnd('/')
        }

    fun close() {
    }

    fun saveProfiles(newProfiles: List<Profile>) {
        // acquire file lock
        val file = File(dbConfigPath)
        val fchannel = file.outputStream().channel
        var lock: FileLock? = null
        try {
            lock = fchannel.tryLock()
        } catch (e: OverlappingFileLockException) {
        }
        if (lock != null) {
            val newConfig = ConnectorConfig(newProfiles, config.credential, config.repo)
            val newConfigContent = Gson().toJson(newConfig)
            file.writeText(newConfigContent)
            lock.release()
        }
        fchannel.close()
    }

    fun loadConfig(): ConnectorConfig {
        val gson = Gson()
        val file = File(dbConfigPath)
        return if (!file.exists()) {
            // if profile does not exists, initialize with empty profile by default.
            val initConfig = ConnectorConfig(emptyList(), null, null)
            file.writeText(gson.toJson(initConfig))
            initConfig
        } else {
            val dbConfigText = file.readText()
            // required by gson deserialization
            val itemType = object : TypeToken<ConnectorConfig>() {}.type
            gson.fromJson(dbConfigText, itemType) ?: throw DBProfileNotValidException()
        }
    }

    fun registerDeleteHandler(handler: suspend (String) -> Unit) {
        this.registeredDeleteHandler.add(handler)
    }

    fun registerUpdateHandler(handler: suspend (Profile) -> Unit) {
        this.registeredUpdateHandler.add(handler)
    }

    private suspend fun reloadProfiles() {
        val newConfig = loadConfig()
        val prevProfiles = profiles
        val newProfiles = newConfig.profiles
        config = newConfig

        val prevProfileNames = prevProfiles.map { it.name }.toHashSet()
        val newProfileName = newProfiles.map { it.name }.toHashSet()

        val prevProfileMap = prevProfiles.associateBy { it.name }

        withContext(Dispatchers.Default) {
            val deleteTasks = (prevProfileNames - newProfileName)
                .map { deletedName ->
                    async {
                        registeredDeleteHandler.forEach { handler ->
                            handler(deletedName)
                        }
                    }
                }.toTypedArray()

            val updateTasks = newProfiles
                .filter { prevProfileMap[it.name] != it }
                .map { updatedProfile ->
                    async {
                        registeredUpdateHandler.forEach { handler ->
                            handler(updatedProfile)
                        }
                    }
                }.toTypedArray()

            awaitAll(*deleteTasks, *updateTasks)
        }
    }

}
