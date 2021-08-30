package io.tellery.services

import com.google.protobuf.Empty
import entities.NewProfile
import entities.ProjectConfig
import io.tellery.grpc.KVEntry
import io.tellery.managers.ProfileManager
import io.tellery.profile.*

class ProfileService(
    private val rm: ProfileManager,
    private val config: ProjectConfig
) : ProfileServiceCoroutineGrpc.ProfileServiceImplBase() {

    override suspend fun getProfile(request: Empty): Profile {
        val profile = rm.getProfileById(config.workspaceId)
        return buildProtoProfile(profile!!)
    }

    override suspend fun upsertProfile(request: UpsertProfileRequestV2): Profile {
        val profile = NewProfile(
            id = config.workspaceId,
            type = request.type,
            credential = request.credential,
            configs = request.configsList.associate { it.key to it.value }
        )
        return buildProtoProfile(rm.upsertProfile(profile))
    }

    override suspend fun listIntegrations(request: Empty): ListIntegrationsResponse {
        val integrations = rm.getAllIntegrationInProfile(config.workspaceId)
        return ListIntegrationsResponse {
            addAllIntegrations(integrations.map { buildProtoIntegration(it) })
        }
    }

    override suspend fun upsertIntegration(request: UpsertIntegrationRequest): Integration {
        val f = request.descriptorForType.findFieldByName("id")
        val integration = entities.Integration(
            id = if (request.hasField(f)) request.id.value else null,
            profileId = config.workspaceId,
            type = request.type,
            configs = request.configsList.associate { it.key to it.value }
        )
        return buildProtoIntegration(rm.upsertIntegration(integration))
    }

    override suspend fun deleteIntegration(request: DeleteIntegrationRequest): Empty {
        rm.deleteIntegration(request.id)
        return Empty.getDefaultInstance()
    }

    private fun buildProtoProfile(profile: NewProfile): Profile {
        return Profile {
            id = profile.id
            type = profile.type
            credential = profile.credential
            addAllConfigs(profile.configs.entries.map {
                KVEntry {
                    key = it.key
                    value = it.value
                }
            })
        }
    }

    private fun buildProtoIntegration(integration: entities.Integration): Integration {
        return Integration {
            id = integration.id!!
            profileId = integration.profileId
            type = integration.type
            addAllConfigs(integration.configs.entries.map {
                KVEntry {
                    key = it.key
                    value = it.value
                }
            })
        }
    }
}
