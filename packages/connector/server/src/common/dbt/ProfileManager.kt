package io.tellery.common.dbt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import io.tellery.common.dbt.DbtManager.isDbtProfile
import io.tellery.connectors.annotations.Dbt
import io.tellery.connectors.profiles.BaseDbtProfile
import io.tellery.entities.Profile
import io.tellery.utils.allSubclasses
import mu.KotlinLogging
import kotlin.reflect.KClass
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.hasAnnotation
import kotlin.reflect.full.primaryConstructor

object ProfileManager {

    private val logger = KotlinLogging.logger {}
    private val MAPPER = ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())
    private val TYPE_TO_CLAZZ: Map<String, KClass<out BaseDbtProfile>> =
        BaseDbtProfile::class.allSubclasses
            .filter { it.hasAnnotation<Dbt>() }
            .associateBy { it.findAnnotation<Dbt>()!!.type }

    fun batchToDbtProfile(profiles: List<Profile>): String {
        val profileMap = profiles
            .filter { isDbtProfile(it) }
            .associate { profile ->
                toDbtProfile(profile).let {
                    profile.configs[Constants.PROFILE_DBT_PROJECT_FIELD] to
                            if (it == null) it else Entity(Entity.Output(it))
                }
            }
        return MAPPER.writeValueAsString(profileMap)
    }

    private fun toDbtProfile(profile: Profile): BaseDbtProfile? {
        // TODO: try-catch is used to handle old version profile, it will be remove next version.
        return try {
            val clazz = TYPE_TO_CLAZZ[profile.type]
                ?: throw RuntimeException("The type is not supported now: ${profile.type}")
            clazz.primaryConstructor!!.call(profile)
        } catch (e: Exception) {
            logger.error("Construct dbt profile meeting some problem.", e)
            null
        }
    }
}
