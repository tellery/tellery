package io.tellery.services

import com.google.protobuf.Empty
import entities.NewProfile
import io.tellery.annotations.Config
import io.tellery.configs.AvailableConfig
import io.tellery.configs.AvailableConfigs
import io.tellery.configs.ConfigField
import io.tellery.grpc.KVEntry
import io.tellery.managers.ConnectorManagerV2
import io.tellery.managers.DbtManagerV2
import io.tellery.managers.IntegrationManager
import io.tellery.managers.ProfileManager
import io.tellery.profile.*
import entities.ProjectConfig as config

class ProfileService(
    private val dbtManager: DbtManagerV2,
    private val profileManager: ProfileManager,
    private val connectorManager: ConnectorManagerV2,
    private val integrationManager: IntegrationManager
) : ProfileServiceCoroutineGrpc.ProfileServiceImplBase() {

    override suspend fun getProfileConfigs(request: Empty): AvailableConfigs {
        return AvailableConfigs {
            addAllAvailableConfigs(connectorManager.getConfigs().map {
                AvailableConfig {
                    type = it.type
                    addAllConfigs(it.configs.map(::buildConfigFieldFromAnnotation))
                }
            })
        }
    }

    override suspend fun getProfile(request: Empty): Profile {
        val profile = profileManager.getProfileById(config.workspaceId)
        return buildProtoProfile(profile!!)
    }

    override suspend fun upsertProfile(request: UpsertProfileRequestV2): Profile {
        val profile = profileManager.upsertProfile(
            NewProfile(
                id = config.workspaceId,
                type = request.type,
                credential = request.credential,
                configs = request.configsList.associate { it.key to it.value }
            )
        )

        connectorManager.reloadConnector()
        dbtManager.reloadContext()
        return buildProtoProfile(profile)
    }

    override suspend fun getIntegrationConfigs(request: Empty): AvailableConfigs {
        return AvailableConfigs {
            addAllAvailableConfigs(integrationManager.getConfigs().map {
                AvailableConfig {
                    type = it.type
                    addAllConfigs(it.configs.map(::buildConfigFieldFromAnnotation))
                }
            })
        }
    }

    override suspend fun listIntegrations(request: Empty): ListIntegrationsResponse {
        val integrations = profileManager.getAllIntegrationInProfile(config.workspaceId)
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
        return buildProtoIntegration(profileManager.upsertIntegration(integration))
    }

    override suspend fun deleteIntegration(request: DeleteIntegrationRequest): Empty {
        profileManager.deleteIntegration(request.id)
        return Empty.getDefaultInstance()
    }

    private fun buildConfigFieldFromAnnotation(confAnnotation: Config): ConfigField {
        return ConfigField {
            name = confAnnotation.name
            type = confAnnotation.type.name
            description = confAnnotation.description
            hint = confAnnotation.hint
            required = confAnnotation.required
            secret = confAnnotation.secret
            fillHint = confAnnotation.fillHint
        }
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
