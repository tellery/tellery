package managers

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import entities.Integration
import entities.NewProfile
import getResourceFileURL
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.FunSpec
import io.kotest.engine.spec.tempdir
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockkObject
import io.tellery.managers.impl.FileProfileManager
import kotlin.io.path.readText
import kotlin.io.path.writeText
import entities.ProjectConfig as config

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
        val profile: NewProfile = mapper.readValue(profileURL)

        pm.upsertProfile(profile)

        val profileAfterSaved: NewProfile =
            mapper.readValue(config.profilePath.readText())

        profileAfterSaved shouldBe profile
    }

    context("update a profile") {
        config.profilePath.writeText(profileURL.readText())

        val profile: NewProfile = mapper.readValue(profileURL)
        val configs = HashMap(profile.configs)
        configs["Username"] = "test"
        configs["Password"] = "test"
        profile.configs = configs

        pm.upsertProfile(profile)

        val profileAfterUpdate: NewProfile =
            mapper.readValue(config.profilePath.readText())

        profileAfterUpdate.let {
            configs["Username"] shouldBe "test"
            configs["Password"] shouldBe "test"
        }
    }

    context("get a profile") {
        config.profilePath.writeText(profileURL.readText())

        val profile: NewProfile = mapper.readValue(profileURL)
        val profileFromGet = pm.getProfileById(profile.id)

        profileFromGet!! shouldBe profile
    }

    context("create a integration") {
        val integration: Integration = mapper.readValue(integrationURL)
        integration.id = null

        pm.upsertIntegration(integration)

        val integrationsAfterSaved: List<Integration> =
            mapper.readValue(config.integrationPath.readText())

        integrationsAfterSaved.size shouldBe 1
        integrationsAfterSaved[0].let {
            it.id shouldBe 1
            it.type shouldBe integration.type
            it.profileId shouldBe integration.profileId
            it.configs shouldBe integration.configs
        }
    }

    context("update a integration") {
        val integration: Integration = mapper.readValue(integrationURL)
        config.integrationPath.writeText(mapper.writeValueAsString(listOf(integration)))

        val configs = HashMap(integration.configs)
        configs["Dbt Project Name"] = "test"
        configs["Git Url"] = "test"
        integration.configs = configs
        pm.upsertIntegration(integration)

        val integrationsAfterUpdated: List<Integration> =
            mapper.readValue(config.integrationPath.readText())

        integrationsAfterUpdated.size shouldBe 1
        integrationsAfterUpdated[0].let {
            it.configs["Dbt Project Name"] shouldBe "test"
            it.configs["Git Url"] shouldBe "test"
        }
    }

    context("get a integration") {
        val integration: Integration = mapper.readValue(integrationURL)
        config.integrationPath.writeText(mapper.writeValueAsString(listOf(integration)))

        val integrationsFromGet = pm.getAllIntegrationInProfile(integration.profileId)

        integrationsFromGet.size shouldBe 1
        integrationsFromGet[0] shouldBe integration
    }

    context("delete a integration") {
        val url = getResourceFileURL("/integrations/integration_1.json")
        val integration: Integration = mapper.readValue(url)
        config.integrationPath.writeText(mapper.writeValueAsString(listOf(integration)))

        pm.deleteIntegration(integration.id!!)

        val integrationsAfterDeleted: List<Integration> =
            mapper.readValue(config.integrationPath.readText())

        integrationsAfterDeleted.size shouldBe 0
    }
})
