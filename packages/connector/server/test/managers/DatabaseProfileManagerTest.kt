package managers

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import entities.Integration
import entities.NewProfile
import execSqlScript
import getResourceFileURL
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.FunSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.tellery.managers.impl.DatabaseProfileManager
import org.ktorm.database.Database
import org.ktorm.logging.ConsoleLogger
import org.ktorm.logging.LogLevel
import org.testcontainers.containers.PostgreSQLContainer

@ExperimentalKotest
class DatabaseProfileManagerTest : FunSpec({

    val pgContainer = PostgreSQLContainer<Nothing>("postgres:13-alpine")
    pgContainer.withDatabaseName("test")
    pgContainer.withUsername("test")
    pgContainer.withPassword("test")

    val mapper = jacksonObjectMapper()
    val profileURL = getResourceFileURL("/profiles/profile_1.json")
    val integrationURL = getResourceFileURL("/integrations/integration_1.json")

    lateinit var database: Database
    lateinit var rm: DatabaseProfileManager

    beforeSpec {
        pgContainer.start()
        database = Database.connect(
            url = pgContainer.jdbcUrl,
            driver = pgContainer.driverClassName,
            user = pgContainer.username,
            password = pgContainer.password,
            logger = ConsoleLogger(threshold = LogLevel.TRACE)
        )
        rm = DatabaseProfileManager(database)
    }

    beforeTest {
        execSqlScript(database, "/sql/init-profile-data.sql")
    }

    afterTest {
        execSqlScript(database, "/sql/cleanup-profile-data.sql")
    }

    context("create and get a profile") {
        val profile: NewProfile = mapper.readValue(profileURL)

        rm.upsertProfile(profile)
        val profileAfterSaved = rm.getProfileById(profile.id)

        profileAfterSaved shouldBe profile
    }

    context("update a profile") {
        val profile: NewProfile = mapper.readValue(profileURL)

        rm.upsertProfile(profile)

        val configs = HashMap(profile.configs)
        configs["Username"] = "test"
        configs["Password"] = "test"
        profile.configs = configs

        rm.upsertProfile(profile)
        val profileAfterUpdated = rm.getProfileById(profile.id)

        profileAfterUpdated.let {
            configs["Username"] shouldBe "test"
            configs["Password"] shouldBe "test"
        }
    }

    context("create and get a integration") {
        val profile: NewProfile = mapper.readValue(profileURL)
        rm.upsertProfile(profile)

        val integration: Integration = mapper.readValue(integrationURL)
        integration.id = null
        rm.upsertIntegration(integration)

        val integrationAfterSaved =
            rm.getIntegrationInProfileAndByType(integration.profileId, integration.type)

        integrationAfterSaved.let {
            it!!.id shouldNotBe null
            it.type shouldBe integration.type
            it.profileId shouldBe integration.profileId
            it.configs shouldBe integration.configs
        }
    }

    context("update a integration") {
        val profile: NewProfile = mapper.readValue(profileURL)
        rm.upsertProfile(profile)

        val integration: Integration = mapper.readValue(integrationURL)
        integration.id = null
        rm.upsertIntegration(integration)

        val integrationAfterSaved =
            rm.getIntegrationInProfileAndByType(integration.profileId, integration.type)

        val configs = HashMap(integrationAfterSaved!!.configs)
        configs["Dbt Project Name"] = "test"
        configs["Git Url"] = "test"
        integrationAfterSaved.configs = configs
        rm.upsertIntegration(integrationAfterSaved)

        val integrationAfterUpdated =
            rm.getIntegrationInProfileAndByType(
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
        rm.upsertProfile(profile)

        val integration: Integration = mapper.readValue(integrationURL)
        integration.id = null
        rm.upsertIntegration(integration)

        val integrationAfterSaved =
            rm.getIntegrationInProfileAndByType(integration.profileId, integration.type)

        rm.deleteIntegration(integrationAfterSaved!!.id!!)

        val integrationAfterDeleted =
            rm.getIntegrationInProfileAndByType(
                integrationAfterSaved.profileId,
                integrationAfterSaved.type
            )

        integrationAfterDeleted shouldBe null
    }
})
