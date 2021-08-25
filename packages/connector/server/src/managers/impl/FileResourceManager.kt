package io.tellery.managers.impl

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import entities.Integration
import entities.NewProfile
import entities.ProjectConfig
import io.tellery.managers.ResourceManager
import org.apache.commons.io.FileUtils
import java.nio.file.Path
import kotlin.io.path.createFile
import kotlin.io.path.notExists
import kotlin.io.path.readText
import kotlin.io.path.writeText

class FileResourceManager(appConfig: ProjectConfig) : ResourceManager {

    private var globalConfigDir: Path = appConfig.getGlobalConfigDir()
    private var profilePath: Path = appConfig.getProfilePath()
    private var integrationPath: Path = appConfig.getIntegrationPath()

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

    override fun upsertProfile(profile: NewProfile) {
        profilePath.writeText(mapper.writeValueAsString(profile))
    }

    override fun getAllIntegrationByProfile(profileId: String): List<Integration> {
        return loadIntegrations()
    }

    override fun getIntegrationByType(type: String): Integration? {
        val integrations = loadIntegrations()
        return integrations.let {
            it.findLast { integration -> integration.type == type }
        }
    }

    override fun upsertIntegration(integration: Integration) {
        val idToIntegration = HashMap(loadIntegrations().associateBy { it.id })
        idToIntegration[integration.id] = integration
        integrationPath.writeText(mapper.writeValueAsString(idToIntegration.values.toList()))
    }

    override fun deleteIntegration(id: String) {
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
}
