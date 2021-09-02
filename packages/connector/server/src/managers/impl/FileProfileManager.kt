package io.tellery.managers.impl

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import io.tellery.entities.Integration
import io.tellery.entities.NewProfile
import io.tellery.managers.ProfileManager
import org.apache.commons.io.FileUtils
import java.nio.file.Path
import kotlin.io.path.createFile
import kotlin.io.path.notExists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import entities.ProjectConfig as config

class FileProfileManager : ProfileManager {

    private var globalConfigDir: Path = config.globalConfigDir
    private var profilePath: Path = config.profilePath
    private var integrationPath: Path = config.integrationPath

    companion object {
        private val mapper = jacksonObjectMapper()
    }

    init {
        if (globalConfigDir.notExists()) {
            FileUtils.forceMkdir(globalConfigDir.toFile())
        }
        if (profilePath.notExists()) {
            profilePath.createFile()
        }
        if (integrationPath.notExists()) {
            integrationPath.createFile()
        }
    }

    override fun getProfileById(workspaceId: String): NewProfile? {
        return loadProfile()
    }

    override fun upsertProfile(profile: NewProfile): NewProfile {
        profilePath.writeText(mapper.writeValueAsString(profile))
        return profile
    }

    override fun getAllIntegrationInProfile(profileId: String): List<Integration> {
        return loadIntegrations()
    }

    override fun getIntegrationInProfileAndByType(profileId: String, type: String): Integration? {
        val integrations = loadIntegrations()
        return integrations.let {
            it.findLast { integration -> integration.type == type }
        }
    }

    override fun upsertIntegration(integration: Integration): Integration {
        val idToIntegration = HashMap(loadIntegrations().associateBy { it.id })

        if (integration.id == null) {
            integration.id = generateIntegrationId(integration.type)
        }

        idToIntegration[integration.id] = integration
        integrationPath.writeText(mapper.writeValueAsString(idToIntegration.values.toList()))
        return integration
    }

    override fun deleteIntegration(id: Int) {
        val idToIntegration = HashMap(loadIntegrations().associateBy { it.id })
        idToIntegration.remove(id)
        integrationPath.writeText(mapper.writeValueAsString(idToIntegration.values.toList()))
    }

    private fun loadProfile(): NewProfile? {
        if (profilePath.notExists() || profilePath.readText().isBlank()) {
            return null
        }

        return mapper.readValue(profilePath.toFile())
    }

    private fun loadIntegrations(): List<Integration> {
        if (integrationPath.notExists() || integrationPath.readText().isBlank()) {
            return listOf()
        }

        return mapper.readValue(integrationPath.toFile())
    }

    private fun generateIntegrationId(type: String): Int {
        return when (type) {
            "dbt" -> 1
            else -> throw RuntimeException()
        }
    }
}
