package managers

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import getResourceFileURL
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.FunSpec
import io.kotest.engine.spec.tempdir
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockkObject
import io.tellery.entities.IntegrationEntity
import io.tellery.entities.ProfileEntity
import io.tellery.managers.impl.FileProfileManager
import kotlin.io.path.readText
import kotlin.io.path.writeText
import io.tellery.entities.ProjectConfig as config

@ExperimentalKotest
class FileProfileManagerTest : FunSpec({

    val dir = tempdir()
    val mapper = jacksonObjectMapper()
    val profileURL = getResourceFileURL("/profiles/profile_redshift.json")
    val integrationURL = getResourceFileURL("/integrations/integration_1.json")

    lateinit var pm: FileProfileManager

    beforeSpec {
        mockkObject(config)
        every { config.globalConfigDir } answers { dir.toPath() }
        every { config.profilePath } answers { dir.toPath().resolve("profiles.json") }
        every { config.integrationPath } answers { dir.toPath().resolve("integration.json") }

        pm = FileProfileManager()
    }

    afterTest {
        dir.deleteRecursively()
        dir.mkdirs()
    }

    context("create a profile") {
        val profileEntity: ProfileEntity = mapper.readValue(profileURL)

        pm.upsertProfile(profileEntity)

        val profileEntityAfterSaved: ProfileEntity =
            mapper.readValue(config.profilePath.readText())

        profileEntityAfterSaved shouldBe profileEntity
    }

    context("update a profile") {
        config.profilePath.writeText(profileURL.readText())

        val profileEntity: ProfileEntity = mapper.readValue(profileURL)
        val configs = HashMap(profileEntity.configs)
        configs["Username"] = "test"
        configs["Password"] = "test"
        profileEntity.configs = configs

        pm.upsertProfile(profileEntity)

        val profileEntityAfterUpdate: ProfileEntity =
            mapper.readValue(config.profilePath.readText())

        profileEntityAfterUpdate.let {
            configs["Username"] shouldBe "test"
            configs["Password"] shouldBe "test"
        }
    }

    context("get a profile") {
        config.profilePath.writeText(profileURL.readText())

        val profileEntity: ProfileEntity = mapper.readValue(profileURL)
        val profileFromGet = pm.getProfileById(profileEntity.id)

        profileFromGet!! shouldBe profileEntity
    }

    context("create a integration") {
        val integrationEntity: IntegrationEntity = mapper.readValue(integrationURL)
        integrationEntity.id = null

        pm.upsertIntegration(integrationEntity)

        val integrationsAfterSaved: List<IntegrationEntity> =
            mapper.readValue(config.integrationPath.readText())

        integrationsAfterSaved.size shouldBe 1
        integrationsAfterSaved[0].let {
            it.id shouldBe 1
            it.type shouldBe integrationEntity.type
            it.profileId shouldBe integrationEntity.profileId
            it.configs shouldBe integrationEntity.configs
        }
    }

    context("update a integration") {
        val integrationEntity: IntegrationEntity = mapper.readValue(integrationURL)
        config.integrationPath.writeText(mapper.writeValueAsString(listOf(integrationEntity)))

        val configs = HashMap(integrationEntity.configs)
        configs["Dbt Project Name"] = "test"
        configs["Git Url"] = "test"
        integrationEntity.configs = configs
        pm.upsertIntegration(integrationEntity)

        val integrationsAfterUpdated: List<IntegrationEntity> =
            mapper.readValue(config.integrationPath.readText())

        integrationsAfterUpdated.size shouldBe 1
        integrationsAfterUpdated[0].let {
            it.configs["Dbt Project Name"] shouldBe "test"
            it.configs["Git Url"] shouldBe "test"
        }
    }

    context("get a integration") {
        val integrationEntity: IntegrationEntity = mapper.readValue(integrationURL)
        config.integrationPath.writeText(mapper.writeValueAsString(listOf(integrationEntity)))

        val integrationsFromGet = pm.getAllIntegrationInProfile(integrationEntity.profileId)

        integrationsFromGet.size shouldBe 1
        integrationsFromGet[0] shouldBe integrationEntity
    }

    context("delete a integration") {
        val url = getResourceFileURL("/integrations/integration_1.json")
        val integrationEntity: IntegrationEntity = mapper.readValue(url)
        config.integrationPath.writeText(mapper.writeValueAsString(listOf(integrationEntity)))

        pm.deleteIntegration(integrationEntity.id!!)

        val integrationsAfterDeleted: List<IntegrationEntity> =
            mapper.readValue(config.integrationPath.readText())

        integrationsAfterDeleted.size shouldBe 0
    }
})
