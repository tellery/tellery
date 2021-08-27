package io.tellery.managers

import entities.ProjectConfig
import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.BaseConnector
import io.tellery.entities.Profile
import io.tellery.utils.allSubclasses
import mu.KotlinLogging
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import java.lang.reflect.InvocationTargetException
import kotlin.reflect.KClass
import kotlin.reflect.full.*

class ConnectorManagerV2 : KoinComponent {
    private val rm: ProfileManager by inject()
    private val config: ProjectConfig by inject()
    private lateinit var connector: BaseConnector

    companion object {
        private val logger = KotlinLogging.logger {}
        private lateinit var dbTypeToClassMap: Map<String, KClass<out BaseConnector>>
        private lateinit var availableConfig: List<Connector>

        init {
            loadConnectors()
        }

        private fun loadConnectors() {
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
        val profile = rm.getProfileById(config.getWorkspaceId()) ?: throw RuntimeException()

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