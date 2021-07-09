package io.tellery.common

import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.BaseConnector
import io.tellery.entities.Profile
import io.tellery.entities.ProfileNotFoundException
import io.tellery.utils.allSubclasses
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import mu.KotlinLogging
import java.util.concurrent.ConcurrentHashMap
import kotlin.reflect.KClass
import kotlin.reflect.full.*

object ConnectorManager {

    private val logger = KotlinLogging.logger {}

    private var profiles: ConcurrentHashMap<String, Profile> = ConcurrentHashMap()
    private var connectors: ConcurrentHashMap<String, BaseConnector> = ConcurrentHashMap()
    private lateinit var dbTypeToClassMap: Map<String, KClass<out BaseConnector>>
    private lateinit var availableConfig: List<Connector>

    fun init() {
        loadConnectors()
        runBlocking {
            val tasks = ConfigManager.profiles.map { async { initializeProfile(it) } }.toTypedArray()
            awaitAll(*tasks)
        }
        ConfigManager.registerUpdateHandler { initializeProfile(it) }
        ConfigManager.registerDeleteHandler { offloadProfile(it) }
    }

    private fun loadConnectors() {
        val loadedConnectorClasses = BaseConnector::class.allSubclasses.filter {
            it.hasAnnotation<Connector>()
        }

        dbTypeToClassMap = loadedConnectorClasses.associateBy {
            it.findAnnotation<Connector>()!!.type
        }

        logger.info { "Loaded Connectors ${dbTypeToClassMap.keys.joinToString(", ")}" }
        availableConfig = loadedConnectorClasses.map { clazz ->
            clazz.findAnnotation()!!
        }
    }

    suspend fun initializeProfile(profile: Profile) {
        if (!dbTypeToClassMap.containsKey(profile.type)) {
            return
        }
        // load profile
        profiles[profile.name] = profile

        // download external driver if needed
        profile.jar?.let {
            logger.info("adding external driver $it")
            DriverLoader.loadJar(it)
        }

        // initialize connector instance
        val clazz = dbTypeToClassMap[profile.type]!!
        val connector = clazz.primaryConstructor!!.call()
        connector.initByProfile(profile)
        connectors[profile.name] = connector

        // initialize connector import dispatcher
        connector.importDispatcher =
            connector::class.declaredMemberFunctions
                .filter { it.hasAnnotation<HandleImport>() }
                .associateBy {
                    it.findAnnotation<HandleImport>()!!.type
                }
                .mapValues { (_, func) ->
                    suspend fun(
                        database: String,
                        collection: String,
                        schema: String?,
                        content: ByteArray
                    ) {
                        func.callSuspend(connector, database, collection, schema, content)
                    }
                }

        logger.info(
            "initialized profile {}; loaded import handler {}",
            profile.name,
            connector.importDispatcher.keys
        )
    }

    suspend fun offloadProfile(profileName: String) {
        profiles.remove(profileName)
        connectors.remove(profileName)
        logger.info("removed profile {}", profileName)
    }


    fun getCurrentProfiles(): ConcurrentHashMap<String, Profile> {
        return profiles
    }

    fun getAvailableConfigs(): List<Connector> {
        return availableConfig
    }

    fun getDBConnector(profileName: String): BaseConnector {
        return connectors[profileName] ?: throw ProfileNotFoundException(profileName)
    }

}
