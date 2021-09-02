package io.tellery.managers

import io.tellery.entities.IntegrationEntity
import io.tellery.entities.ProfileEntity

interface ProfileManager {

    fun getProfileById(workspaceId: String): ProfileEntity?

    fun upsertProfile(profileEntity: ProfileEntity): ProfileEntity

    fun getAllIntegrationInProfile(profileId: String): List<IntegrationEntity>

    fun getIntegrationInProfileAndByType(profileId: String, type: String): IntegrationEntity?

    fun upsertIntegration(integrationEntity: IntegrationEntity): IntegrationEntity

    fun deleteIntegration(id: Int)
}