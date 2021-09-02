package managers

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import entities.ProjectConfig
import execSqlScript
import getResourceFileURL
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.mockk.every
import io.mockk.mockkObject
import io.tellery.entities.Integration
import io.tellery.entities.NewProfile
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
        val profile: NewProfile = mapper.readValue(profileURL)

        pm.upsertProfile(profile)
        val profileAfterSaved = pm.getProfileById(profile.id)

        profileAfterSaved shouldBe profile
    }

    context("update a profile") {
        val profile: NewProfile = mapper.readValue(profileURL)

        pm.upsertProfile(profile)

        val configs = HashMap(profile.configs)
        configs["Username"] = "test"
        configs["Password"] = "test"
        profile.configs = configs

        pm.upsertProfile(profile)
        val profileAfterUpdated = pm.getProfileById(profile.id)

        profileAfterUpdated.let {
            configs["Username"] shouldBe "test"
            configs["Password"] shouldBe "test"
        }
    }

    context("create and get a integration") {
        val profile: NewProfile = mapper.readValue(profileURL)
        pm.upsertProfile(profile)

        val integration: Integration = mapper.readValue(integrationURL)
        integration.id = null
        pm.upsertIntegration(integration)

        val integrationAfterSaved =
            pm.getIntegrationInProfileAndByType(integration.profileId, integration.type)

        integrationAfterSaved.let {
            it!!.id shouldNotBe null
            it.type shouldBe integration.type
            it.profileId shouldBe integration.profileId
            it.configs shouldBe integration.configs
        }
    }

    context("update a integration") {
        val profile: NewProfile = mapper.readValue(profileURL)
        pm.upsertProfile(profile)

        val integration: Integration = mapper.readValue(integrationURL)
        integration.id = null
        pm.upsertIntegration(integration)

        val integrationAfterSaved =
            pm.getIntegrationInProfileAndByType(integration.profileId, integration.type)

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
        val profile: NewProfile = mapper.readValue(profileURL)
        pm.upsertProfile(profile)

        val integration: Integration = mapper.readValue(integrationURL)
        integration.id = null
        pm.upsertIntegration(integration)

        val integrationAfterSaved =
            pm.getIntegrationInProfileAndByType(integration.profileId, integration.type)

        pm.deleteIntegration(integrationAfterSaved!!.id!!)

        val integrationAfterDeleted =
            pm.getIntegrationInProfileAndByType(
                integrationAfterSaved.profileId,
                integrationAfterSaved.type
            )

        integrationAfterDeleted shouldBe null
    }
})
