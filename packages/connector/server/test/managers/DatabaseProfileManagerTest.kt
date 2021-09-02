package managers

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import execSqlScript
import getResourceFileURL
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.every
import io.mockk.mockkObject
import io.tellery.entities.IntegrationEntity
import io.tellery.entities.ProfileEntity
import io.tellery.entities.ProjectConfig
import io.tellery.managers.impl.DatabaseProfileManager
import org.testcontainers.containers.PostgreSQLContainer

@ExperimentalKotest
class DatabaseProfileManagerTest : FunSpec({

    val pgContainer = PostgreSQLContainer<Nothing>("postgres:13-alpine")
    pgContainer.withDatabaseName("test")
    pgContainer.withUsername("test")
    pgContainer.withPassword("test")

    val mapper = jacksonObjectMapper()
    val profileURL = getResourceFileURL("/profiles/profile_redshift.json")
    val integrationURL = getResourceFileURL("/integrations/integration_1.json")

    lateinit var pm: DatabaseProfileManager

    beforeSpec {
        pgContainer.start()
        mockkObject(ProjectConfig)
        every { ProjectConfig.databaseURL } answers { pgContainer.jdbcUrl }
        every { ProjectConfig.databaseUser } answers { pgContainer.username }
        every { ProjectConfig.databasePassword } answers { pgContainer.password }

        pm = DatabaseProfileManager()
    }

    beforeTest {
        execSqlScript(pm.client, "/sql/init-profile-data.sql")
    }

    afterTest {
        execSqlScript(pm.client, "/sql/cleanup-profile-data.sql")
    }

    context("create and get a profile") {
        val profileEntity: ProfileEntity = mapper.readValue(profileURL)

        pm.upsertProfile(profileEntity)
        val profileAfterSaved = pm.getProfileById(profileEntity.id)

        profileAfterSaved shouldBe profileEntity
    }

    context("update a profile") {
        val profileEntity: ProfileEntity = mapper.readValue(profileURL)

        pm.upsertProfile(profileEntity)

        val configs = HashMap(profileEntity.configs)
        configs["Username"] = "test"
        configs["Password"] = "test"
        profileEntity.configs = configs

        pm.upsertProfile(profileEntity)
        val profileAfterUpdated = pm.getProfileById(profileEntity.id)

        profileAfterUpdated.let {
            configs["Username"] shouldBe "test"
            configs["Password"] shouldBe "test"
        }
    }

    context("create and get a integration") {
        val profileEntity: ProfileEntity = mapper.readValue(profileURL)
        pm.upsertProfile(profileEntity)

        val integrationEntity: IntegrationEntity = mapper.readValue(integrationURL)
        integrationEntity.id = null
        pm.upsertIntegration(integrationEntity)

        val integrationAfterSaved =
            pm.getIntegrationInProfileAndByType(integrationEntity.profileId, integrationEntity.type)

        integrationAfterSaved.let {
            it!!.id shouldNotBe null
            it.type shouldBe integrationEntity.type
            it.profileId shouldBe integrationEntity.profileId
            it.configs shouldBe integrationEntity.configs
        }
    }

    context("update a integration") {
        val profileEntity: ProfileEntity = mapper.readValue(profileURL)
        pm.upsertProfile(profileEntity)

        val integrationEntity: IntegrationEntity = mapper.readValue(integrationURL)
        integrationEntity.id = null
        pm.upsertIntegration(integrationEntity)

        val integrationAfterSaved =
            pm.getIntegrationInProfileAndByType(integrationEntity.profileId, integrationEntity.type)

        val configs = HashMap(integrationAfterSaved!!.configs)
        configs["Dbt Project Name"] = "test"
        configs["Git Url"] = "test"
        integrationAfterSaved.configs = configs
        pm.upsertIntegration(integrationAfterSaved)

        val integrationAfterUpdated =
            pm.getIntegrationInProfileAndByType(
                integrationAfterSaved.profileId,
                integrationAfterSaved.type
            )

        integrationAfterUpdated.let {
            it!!.configs["Dbt Project Name"] shouldBe "test"
            it.configs["Git Url"] shouldBe "test"
        }
    }

    context("delete a integration") {
        val profileEntity: ProfileEntity = mapper.readValue(profileURL)
        pm.upsertProfile(profileEntity)

        val integrationEntity: IntegrationEntity = mapper.readValue(integrationURL)
        integrationEntity.id = null
        pm.upsertIntegration(integrationEntity)

        val integrationAfterSaved =
            pm.getIntegrationInProfileAndByType(integrationEntity.profileId, integrationEntity.type)

        pm.deleteIntegration(integrationAfterSaved!!.id!!)

        val integrationAfterDeleted =
            pm.getIntegrationInProfileAndByType(
                integrationAfterSaved.profileId,
                integrationAfterSaved.type
            )

        integrationAfterDeleted shouldBe null
    }
})
