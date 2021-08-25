package io.tellery.managers

import entities.Integration
import entities.NewProfile

interface ResourceManager {

    fun getProfileById(workspaceId: String): NewProfile?

    fun upsertProfile(profile: NewProfile)

    fun getIntegrationByType(type: String): Integration?

    fun getAllIntegrationByProfile(profileId: String): List<Integration>
    
    fun upsertIntegration(integration: Integration)

    fun deleteIntegration(id: String)
}