package io.tellery.managers

import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.BaseConnector
import io.tellery.entities.CustomizedException
import io.tellery.entities.ProfileSpecEntity
import io.tellery.entities.ProjectConfig
import io.tellery.utils.allSubclasses
import io.tellery.utils.toBase64
import mu.KotlinLogging
import java.lang.reflect.InvocationTargetException
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write
import kotlin.reflect.KClass
import kotlin.reflect.full.*

class ConnectorManager(private val profileManager: ProfileManager) {
    private val lock = ReentrantReadWriteLock()
    private var connector: BaseConnector? = null
    private var profileSpec: ProfileSpecEntity? = null

    companion object {
        private val logger = KotlinLogging.logger {}
        private var dbTypeToClassMap: Map<String, KClass<out BaseConnector>>
        private var availableConfig: List<Connector>

        init {
            val loadedConnectorClasses = BaseConnector::class.allSubclasses.filter {
                it.hasAnnotation<Connector>()
            }

            dbTypeToClassMap = loadedConnectorClasses.associateBy {
                it.findAnnotation<Connector>()!!.type
            }

            logger.info { "Loaded Connectors: ${dbTypeToClassMap.keys.joinToString(", ")}" }

            availableConfig = dbTypeToClassMap.values.map { it.findAnnotation()!! }
        }
    }

    fun reloadConnector() = lock.write {
        profileManager
            .getProfileById(ProjectConfig.workspaceId)
            ?.let { profile ->
                // initialize connector instance
                val clazz = dbTypeToClassMap[profile.type]!!
                connector = clazz.primaryConstructor!!.call()
                connector!!.let { conn ->
                    conn.initByProfile(profile)

                    // initialize connector import dispatcher
                    conn.importDispatcher =
                        conn::class.declaredMemberFunctions
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
                                        func.callSuspend(
                                            connector,
                                            database,
                                            collection,
                                            schema,
                                            content
                                        )
                                    } catch (e: InvocationTargetException) {
                                        throw e.targetException
                                    }
                                }
                            }

                    profileSpec = loadProfileSpecByType(profile.type)

                    logger.info(
                        "initialized profile {}; loaded import handler {}",
                        profile.toString(),
                        conn.importDispatcher.keys
                    )
                }
            }
            ?: logger.warn { "Can not init the connector, maybe the workspace have no profile." }
    }

    fun getConnector(): BaseConnector = lock.read {
        connector ?: throw ConnectorNotInitException()
    }

    fun getConfigs() = availableConfig

    fun getProfileSpec(): ProfileSpecEntity = lock.read {
        profileSpec ?: throw ConnectorNotInitException()
    }

    private fun loadProfileSpecByType(type: String): ProfileSpecEntity {
        val resourceLoader = Thread.currentThread().contextClassLoader::getResource
        val tokenizer =
            resourceLoader("${type.replace('/', '-')}Tokenizer.js")?.readBytes()?.toBase64()
        val queryBuilderSpec =
            resourceLoader("${type.replace('/', '-')}QueryBuilderSpec.json")?.readBytes()
                ?.toBase64()

        requireNotNull(tokenizer) { "Tokenizer file of $type is not correctly placed into the resources" }
        requireNotNull(queryBuilderSpec) { "MetricSupport file of $type is not correctly placed into the resources" }
        return ProfileSpecEntity(type, tokenizer, queryBuilderSpec)
    }
}

class ConnectorNotInitException :
    CustomizedException("The connector is not be initialized, you can't get it.")