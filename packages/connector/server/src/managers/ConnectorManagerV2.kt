package io.tellery.managers

import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.BaseConnector
import io.tellery.entities.CustomizedException
import io.tellery.entities.Profile
import io.tellery.entities.ProjectConfig
import io.tellery.utils.allSubclasses
import mu.KotlinLogging
import java.lang.reflect.InvocationTargetException
import java.util.concurrent.locks.ReentrantReadWriteLock
import kotlin.concurrent.read
import kotlin.concurrent.write
import kotlin.reflect.KClass
import kotlin.reflect.full.*

class ConnectorManagerV2(val profileManager: ProfileManager) {
    private val lock = ReentrantReadWriteLock()
    private var connector: BaseConnector? = null

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
                    conn.initByProfile(Profile(profile))

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
}

class ConnectorNotInitException :
    CustomizedException("The connector is not be initialized, you can't get it.")