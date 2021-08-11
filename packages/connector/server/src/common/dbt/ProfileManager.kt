package io.tellery.common.dbt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import io.tellery.common.dbt.DbtManager.isDbtProfile
import io.tellery.connectors.annotations.Dbt
import io.tellery.connectors.profiles.BaseDbtProfile
import io.tellery.entities.Profile
import io.tellery.utils.allSubclasses
import kotlin.reflect.KClass
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.hasAnnotation
import kotlin.reflect.full.primaryConstructor

object ProfileManager {

    private val MAPPER = ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())
    private val TYPE_TO_CLAZZ: Map<String, KClass<out BaseDbtProfile>> =
        BaseDbtProfile::class.allSubclasses
            .filter { it.hasAnnotation<Dbt>() }
            .associateBy { it.findAnnotation<Dbt>()!!.type }

    fun batchToDbtProfile(profiles: List<Profile>): String {
        val profileMap = profiles
            .filter { isDbtProfile(it) }
            .associate {
                it.configs[Constants.PROFILE_DBT_PROJECT_FIELD] to Entity(
                    Entity.Output(toDbtProfile(it))
                )
            }
        return MAPPER.writeValueAsString(profileMap)
    }

    private fun toDbtProfile(profile: Profile): BaseDbtProfile {
        val clazz = TYPE_TO_CLAZZ[profile.type]
            ?: throw RuntimeException("The type is not supported now: ${profile.type}")
        return clazz.primaryConstructor!!.call(profile)
    }
}
