package io.tellery.managers.impl

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import io.tellery.entities.IntegrationEntity
import io.tellery.entities.ProfileEntity
import io.tellery.managers.ProfileManager
import org.apache.commons.io.FileUtils
import java.nio.file.Path
import kotlin.io.path.createFile
import kotlin.io.path.notExists
import kotlin.io.path.readText
import kotlin.io.path.writeText
import io.tellery.entities.ProjectConfig as config

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

    override fun getProfileById(workspaceId: String): ProfileEntity? {
        return loadProfile()
    }

    override fun upsertProfile(profileEntity: ProfileEntity): ProfileEntity {
        profilePath.writeText(mapper.writeValueAsString(profileEntity))
        return profileEntity
    }

    override fun getAllIntegrationInProfile(profileId: String): List<IntegrationEntity> {
        return loadIntegrations()
    }

    override fun getIntegrationInProfileAndByType(
        profileId: String,
        type: String
    ): IntegrationEntity? {
        val integrations = loadIntegrations()
        return integrations.let {
            it.findLast { integration -> integration.type == type }
        }
    }

    override fun upsertIntegration(integrationEntity: IntegrationEntity): IntegrationEntity {
        val idToIntegration = HashMap(loadIntegrations().associateBy { it.id })

        if (integrationEntity.id == null) {
            integrationEntity.id = generateIntegrationId(integrationEntity.type)
        }

        idToIntegration[integrationEntity.id] = integrationEntity
        integrationPath.writeText(mapper.writeValueAsString(idToIntegration.values.toList()))
        return integrationEntity
    }

    override fun deleteIntegration(id: Int) {
        val idToIntegration = HashMap(loadIntegrations().associateBy { it.id })
        idToIntegration.remove(id)
        integrationPath.writeText(mapper.writeValueAsString(idToIntegration.values.toList()))
    }

    private fun loadProfile(): ProfileEntity? {
        if (profilePath.notExists() || profilePath.readText().isBlank()) {
            return null
        }

        return mapper.readValue(profilePath.toFile())
    }

    private fun loadIntegrations(): List<IntegrationEntity> {
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
