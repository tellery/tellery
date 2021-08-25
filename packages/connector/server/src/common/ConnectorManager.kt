package io.tellery.common

import io.tellery.annotations.Config
import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.BaseConnector
import io.tellery.connectors.annotations.Dbt
import io.tellery.connectors.profiles.BaseDbtProfile
import io.tellery.entities.Profile
import io.tellery.entities.ProfileNotFoundException
import io.tellery.utils.allSubclasses
import io.tellery.utils.toBase64
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.runBlocking
import mu.KotlinLogging
import java.lang.reflect.InvocationTargetException
import java.util.concurrent.ConcurrentHashMap
import kotlin.reflect.KClass
import kotlin.reflect.full.*

object ConnectorManager {

    data class ProfileSpec(val type: String, val tokenizer: String, val metricSpec: String)

    private val logger = KotlinLogging.logger {}

    private var profiles: ConcurrentHashMap<String, Profile> = ConcurrentHashMap()
    private var connectors: ConcurrentHashMap<String, BaseConnector> = ConcurrentHashMap()
    private lateinit var dbTypeToClassMap: Map<String, KClass<out BaseConnector>>
    private lateinit var propertySpecs: Map<String, ProfileSpec>
    private lateinit var availableConfig: List<AvailableConfigAnnotation>

    fun init() {
        loadConnectors()
        runBlocking {
            val tasks =
                ConfigManager.profiles.map { async { initializeProfile(it) } }.toTypedArray()
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

        val resourceLoader = Thread.currentThread().contextClassLoader::getResource
        propertySpecs = dbTypeToClassMap.keys.associateWith { type ->
            val tokenizer =
                resourceLoader("${type.replace('/', '-')}Tokenizer.js")?.readBytes()?.toBase64()
            val metricSpec =
                resourceLoader("${type.replace('/', '-')}MetricSpec.json")?.readBytes()?.toBase64()

            requireNotNull(tokenizer) { "Tokenizer file of $type is not correctly placed into the resources" }
            requireNotNull(metricSpec) { "MetricSupport file of $type is not correctly placed into the resources" }

            ProfileSpec(type, tokenizer, metricSpec)
        }

        val dbTypeToDbtProfileClassMap = BaseDbtProfile::class.allSubclasses
            .filter { it.hasAnnotation<Dbt>() }
            .associateBy { it.findAnnotation<Dbt>()!!.type }

        logger.info { "Loaded Connectors ${dbTypeToClassMap.keys.joinToString(", ")}" }
        logger.info { "Loaded Dbt Profile ${dbTypeToDbtProfileClassMap.keys.joinToString(", ")}" }

        availableConfig = dbTypeToClassMap.entries.map { entry ->
            AvailableConfigAnnotation(
                connector = entry.value.findAnnotation()!!,
                dbt = dbTypeToDbtProfileClassMap[entry.key]?.findAnnotation()
            )
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
                        try {
                            func.callSuspend(connector, database, collection, schema, content)
                        } catch (e: InvocationTargetException) {
                            throw e.targetException
                        }
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

    fun getAvailableConfigs(): List<AvailableConfigAnnotation> {
        return availableConfig
    }

    fun getDBConnector(profileName: String): BaseConnector {
        return connectors[profileName] ?: throw ProfileNotFoundException(profileName)
    }

    fun getProfileSpec(profileName: String): ProfileSpec {
        val profile = profiles[profileName] ?: throw ProfileNotFoundException(profileName)
        return propertySpecs[profile.type]!!
    }

    data class AvailableConfigAnnotation(val connector: Connector, val dbt: Dbt?) {
        val type: String
            get() = connector.type

        val configs: Array<Config>
            get() = connector.configs + (dbt?.configs ?: arrayOf())
    }
}
