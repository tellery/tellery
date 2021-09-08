package io.tellery.managers

import io.tellery.annotations.Integration
import io.tellery.integrations.BaseIntegration
import io.tellery.utils.allSubclasses
import mu.KotlinLogging
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.hasAnnotation

class IntegrationManager {

    companion object {
        private val logger = KotlinLogging.logger {}
        private val availableConfig: List<Integration>

        init {
            val loadedIntegrationClasses = BaseIntegration::class.allSubclasses.filter {
                it.hasAnnotation<Integration>()
            }
            availableConfig = loadedIntegrationClasses.map { it.findAnnotation()!! }
            logger.info { "Loaded Integrations: ${availableConfig.joinToString(", ") { it.type }}" }
        }
    }

    fun getConfigs(): List<Integration> = availableConfig
}