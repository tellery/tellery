package managers

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import entities.Integration
import entities.NewProfile
import entities.ProjectConfig
import getResourceFileURL
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.FunSpec
import io.kotest.engine.spec.tempdir
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import io.tellery.managers.impl.FileProfileManager
import kotlin.io.path.readText
import kotlin.io.path.writeText

@ExperimentalKotest
class FileProfileManagerTest : FunSpec({

    lateinit var appConfig: ProjectConfig
    lateinit var rm: FileProfileManager

    val dir = tempdir()
    val mapper = jacksonObjectMapper()
    val profileURL = getResourceFileURL("/profiles/profile_1.json")
    val integrationURL = getResourceFileURL("/integrations/integration_1.json")

    beforeSpec {
        appConfig = mockk()
        every { appConfig.globalConfigDir } returns dir.toPath()
        every { appConfig.profilePath } returns dir.toPath().resolve("profiles.json")
        every { appConfig.integrationPath } returns dir.toPath().resolve("integration.json")

        rm = FileProfileManager(appConfig)
    }

    afterTest {
        dir.deleteRecursively()
        dir.mkdirs()
    }

    context("create a profile") {
        val profile: NewProfile = mapper.readValue(profileURL)

        rm.upsertProfile(profile)

        val profileAfterSaved: NewProfile =
            mapper.readValue(appConfig.profilePath.readText())

        profileAfterSaved shouldBe profile
    }

    context("update a profile") {
        appConfig.profilePath.writeText(profileURL.readText())

        val profile: NewProfile = mapper.readValue(profileURL)
        val configs = HashMap(profile.configs)
        configs["Username"] = "test"
        configs["Password"] = "test"
        profile.configs = configs

        rm.upsertProfile(profile)

        val profileAfterUpdate: NewProfile =
            mapper.readValue(appConfig.profilePath.readText())

        profileAfterUpdate.let {
            configs["Username"] shouldBe "test"
            configs["Password"] shouldBe "test"
        }
    }

    context("get a profile") {
        appConfig.profilePath.writeText(profileURL.readText())

        val profile: NewProfile = mapper.readValue(profileURL)
        val profileFromGet = rm.getProfileById(profile.id)

        profileFromGet!! shouldBe profile
    }

    context("create a integration") {
        val integration: Integration = mapper.readValue(integrationURL)
        integration.id = null

        rm.upsertIntegration(integration)

        val integrationsAfterSaved: List<Integration> =
            mapper.readValue(appConfig.integrationPath.readText())

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
        appConfig.integrationPath.writeText(mapper.writeValueAsString(listOf(integration)))

        val configs = HashMap(integration.configs)
        configs["Dbt Project Name"] = "test"
        configs["Git Url"] = "test"
        integration.configs = configs
        rm.upsertIntegration(integration)

        val integrationsAfterUpdated: List<Integration> =
            mapper.readValue(appConfig.integrationPath.readText())

        integrationsAfterUpdated.size shouldBe 1
        integrationsAfterUpdated[0].let {
            it.configs["Dbt Project Name"] shouldBe "test"
            it.configs["Git Url"] shouldBe "test"
        }
    }

    context("get a integration") {
        val integration: Integration = mapper.readValue(integrationURL)
        appConfig.integrationPath.writeText(mapper.writeValueAsString(listOf(integration)))

        val integrationsFromGet = rm.getAllIntegrationInProfile(integration.profileId)

        integrationsFromGet.size shouldBe 1
        integrationsFromGet[0] shouldBe integration
    }

    context("delete a integration") {
        val url = getResourceFileURL("/integrations/integration_1.json")
        val integration: Integration = mapper.readValue(url)
        appConfig.integrationPath.writeText(mapper.writeValueAsString(listOf(integration)))

        rm.deleteIntegration(integration.id!!)

        val integrationsAfterDeleted: List<Integration> =
            mapper.readValue(appConfig.integrationPath.readText())

        integrationsAfterDeleted.size shouldBe 0
    }
})
