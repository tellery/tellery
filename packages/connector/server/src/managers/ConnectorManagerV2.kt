package io.tellery.managers

import entities.ProjectConfig
import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.BaseConnector
import io.tellery.entities.Profile
import io.tellery.utils.allSubclasses
import mu.KotlinLogging
import java.lang.reflect.InvocationTargetException
import kotlin.reflect.KClass
import kotlin.reflect.full.*

class ConnectorManagerV2(
    private val rm: ProfileManager,
    private val config: ProjectConfig
) {
    private lateinit var connector: BaseConnector

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

            logger.info { "Loaded Connectors ${dbTypeToClassMap.keys.joinToString(", ")}" }

            availableConfig = dbTypeToClassMap.values.map { it.findAnnotation()!! }
        }
    }

    init {
        initializeConnector()
    }

    fun initializeConnector() {
        val profile = rm.getProfileById(config.workspaceId) ?: throw RuntimeException()

        // initialize connector instance
        val clazz = dbTypeToClassMap[profile.type]!!
        connector = clazz.primaryConstructor!!.call()
        connector.initByProfile(Profile(profile))

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
            profile.toString(),
            connector.importDispatcher.keys
        )
    }
}