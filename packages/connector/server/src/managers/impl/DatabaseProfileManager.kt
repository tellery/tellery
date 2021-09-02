package io.tellery.managers.impl

import io.tellery.entities.IntegrationEntity
import io.tellery.entities.MissRequiredConfigException
import io.tellery.entities.ProfileEntity
import io.tellery.managers.ProfileManager
import org.ktorm.database.Database
import org.ktorm.dsl.*
import org.ktorm.schema.BaseTable
import org.ktorm.schema.int
import org.ktorm.schema.varchar
import org.ktorm.support.postgresql.hstore
import org.ktorm.support.postgresql.insertOrUpdate
import io.tellery.entities.ProjectConfig as config

class DatabaseProfileManager : ProfileManager {

    val client: Database = Database.connect(
        url = config.databaseURL ?: throw MissRequiredConfigException("databaseURL"),
        driver = "org.postgresql.Driver",
        user = config.databaseUser,
        password = config.databasePassword
    )

    override fun getProfileById(workspaceId: String): ProfileEntity? =
        client.from(ProfileDTO)
            .select()
            .where { ProfileDTO.id eq workspaceId }
            .map { ProfileDTO.createEntity(it) }
            .firstOrNull()

    override fun upsertProfile(profileEntity: ProfileEntity): ProfileEntity {
        client.insertOrUpdate(ProfileDTO) {
            set(it.id, profileEntity.id)
            set(it.type, profileEntity.type)
            set(it.credential, profileEntity.credential)
            set(it.configs, profileEntity.configs)
            onConflict(it.id) {
                set(it.type, profileEntity.type)
                set(it.credential, profileEntity.credential)
                set(it.configs, profileEntity.configs)
            }
        }
        return profileEntity
    }

    override fun getIntegrationInProfileAndByType(
        profileId: String,
        type: String
    ): IntegrationEntity? =
        client.from(IntegrationDTO)
            .select()
            .where { (IntegrationDTO.type eq type) and (IntegrationDTO.profileId eq profileId) }
            .map { IntegrationDTO.createEntity(it) }
            .firstOrNull()

    override fun upsertIntegration(integrationEntity: IntegrationEntity): IntegrationEntity {
        if (integrationEntity.id == null) {
            val id = client.insertAndGenerateKey(IntegrationDTO) {
                set(it.profileId, integrationEntity.profileId)
                set(it.type, integrationEntity.type)
                set(it.configs, integrationEntity.configs)
            }
            integrationEntity.id = id as Int
        } else {
            client.update(IntegrationDTO) {
                set(it.profileId, integrationEntity.profileId)
                set(it.type, integrationEntity.type)
                set(it.configs, integrationEntity.configs)
                where { it.id eq integrationEntity.id!! }
            }
        }
        return integrationEntity
    }

    override fun getAllIntegrationInProfile(profileId: String): List<IntegrationEntity> =
        client.from(IntegrationDTO)
            .select()
            .where { IntegrationDTO.profileId eq profileId }
            .map { IntegrationDTO.createEntity(it) }

    override fun deleteIntegration(id: Int) {
        client.delete(IntegrationDTO) { it.id eq id }
    }

    object ProfileDTO : BaseTable<ProfileEntity>("profile") {
        val id = varchar("id").primaryKey()
        val type = varchar("type")
        val credential = varchar("credential")
        val configs = hstore("configs")


        override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = ProfileEntity(
            id = row[id].orEmpty(),
            type = row[type].orEmpty(),
            credential = row[credential],
            configs = if (row[configs] != null) row[configs]!!.toMap() else mapOf()
        )
    }

    object IntegrationDTO : BaseTable<IntegrationEntity>("integration") {
        val id = int("id").primaryKey()
        val profileId = varchar("profile_id")
        val type = varchar("type")
        val configs = hstore("configs")

        override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = IntegrationEntity(
            id = row[id],
            profileId = row[profileId].orEmpty(),
            type = row[type].orEmpty(),
            configs = if (row[configs] != null) row[configs]!!.toMap() else mapOf()
        )
    }
}