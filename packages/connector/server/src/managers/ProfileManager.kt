package io.tellery.managers

import io.tellery.entities.Integration
import io.tellery.entities.NewProfile

interface ProfileManager {

    fun getProfileById(workspaceId: String): NewProfile?

    fun upsertProfile(profile: NewProfile): NewProfile

    fun getAllIntegrationInProfile(profileId: String): List<Integration>

    fun getIntegrationInProfileAndByType(profileId: String, type: String): Integration?

    fun upsertIntegration(integration: Integration): Integration

    fun deleteIntegration(id: Int)
}