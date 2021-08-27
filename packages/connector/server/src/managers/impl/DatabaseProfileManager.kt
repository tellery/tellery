package io.tellery.managers.impl

import entities.Integration
import entities.NewProfile
import io.tellery.managers.ProfileManager
import org.ktorm.database.Database
import org.ktorm.dsl.*
import org.ktorm.schema.BaseTable
import org.ktorm.schema.int
import org.ktorm.schema.varchar
import org.ktorm.support.postgresql.hstore
import org.ktorm.support.postgresql.insertOrUpdate

class DatabaseProfileManager(private val client: Database) : ProfileManager {
    override fun getProfileById(workspaceId: String): NewProfile? {
        return client
            .from(ProfileDTO)
            .select()
            .where { ProfileDTO.id eq workspaceId }
            .map { ProfileDTO.createEntity(it) }
            .firstOrNull()
    }

    override fun upsertProfile(profile: NewProfile): NewProfile {
        client.insertOrUpdate(ProfileDTO) {
            set(it.id, profile.id)
            set(it.type, profile.type)
            set(it.credential, profile.credential)
            set(it.configs, profile.configs)
            onConflict(it.id) {
                set(it.type, profile.type)
                set(it.credential, profile.credential)
                set(it.configs, profile.configs)
            }
        }
        return profile
    }

    override fun getIntegrationInProfileAndByType(profileId: String, type: String): Integration? {
        return client
            .from(IntegrationDTO)
            .select()
            .where { (IntegrationDTO.type eq type) and (IntegrationDTO.profileId eq profileId) }
            .map { IntegrationDTO.createEntity(it) }
            .firstOrNull()
    }

    override fun upsertIntegration(integration: Integration): Integration {
        if (integration.id == null) {
            val id = client.insertAndGenerateKey(IntegrationDTO) {
                set(it.profileId, integration.profileId)
                set(it.type, integration.type)
                set(it.configs, integration.configs)
            }
            integration.id = id as Int
        } else {
            client.update(IntegrationDTO) {
                set(it.profileId, integration.profileId)
                set(it.type, integration.type)
                set(it.configs, integration.configs)
                where { it.id eq integration.id!! }
            }
        }

        return integration
    }

    override fun getAllIntegrationInProfile(profileId: String): List<Integration> {
        return client
            .from(IntegrationDTO)
            .select()
            .where { IntegrationDTO.profileId eq profileId }
            .map { IntegrationDTO.createEntity(it) }
    }

    override fun deleteIntegration(id: Int) {
        client.delete(IntegrationDTO) { it.id eq id }
    }

    object ProfileDTO : BaseTable<NewProfile>("profile") {
        val id = varchar("id").primaryKey()
        val type = varchar("type")
        val credential = varchar("credential")
        val configs = hstore("configs")


        override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = NewProfile(
            id = row[id].orEmpty(),
            type = row[type].orEmpty(),
            credential = row[credential],
            configs = if (row[configs] != null) row[configs]!!.toMap() else mapOf()
        )
    }

    object IntegrationDTO : BaseTable<Integration>("integration") {
        val id = int("id").primaryKey()
        val profileId = varchar("profile_id")
        val type = varchar("type")
        val configs = hstore("configs")

        override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Integration(
            id = row[id],
            profileId = row[profileId].orEmpty(),
            type = row[type].orEmpty(),
            configs = if (row[configs] != null) row[configs]!!.toMap() else mapOf()
        )
    }
}