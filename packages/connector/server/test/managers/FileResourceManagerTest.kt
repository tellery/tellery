package managers

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import entities.Integration
import entities.NewProfile
import entities.ProjectConfig
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.FunSpec
import io.kotest.datatest.withData
import io.kotest.engine.spec.tempdir
import io.kotest.matchers.shouldBe
import io.mockk.every
import io.mockk.mockk
import io.tellery.managers.impl.FileResourceManager
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll

@ExperimentalKotest
class FileResourceManagerTest : FunSpec({

    lateinit var appConfig: ProjectConfig
    lateinit var rm: FileResourceManager

    val dir = tempdir()
    val mapper = jacksonObjectMapper()

    beforeSpec {
        appConfig = mockk()
        every { appConfig.getGlobalConfigDir() } returns dir.toPath()
        every { appConfig.getProfilePath() } returns dir.toPath().resolve("profiles.json")
        every { appConfig.getIntegrationPath() } returns dir.toPath().resolve("integration.json")

        rm = FileResourceManager(appConfig)
    }

    afterTest {
        dir.deleteRecursively()
        dir.mkdirs()
    }

    context("upsert a profile and the saved profile should equal to the input.") {
        val profileNames = listOf(
            "/profiles/profile_1.json",
            "/profiles/profile_2.json"
        )

        withData(profileNames) { profileName ->
            val profile: NewProfile =
                mapper.readValue(FileResourceManagerTest::class.java.getResource(profileName))

            rm.upsertProfile(profile)
            val profileAfterSaved = rm.getProfileById(profile.workspaceId)

            profileAfterSaved.let {
                it!!.workspaceId shouldBe profile.workspaceId
                it.type shouldBe profile.type
                it.configs shouldBe profile.configs
            }
        }
    }

    context("upsert a integration and the saved integration should equal to the input.") {
        val integrationNames = listOf(
            "/integrations/integration_1.json",
            "/integrations/integration_2.json"
        )

        withData(integrationNames) { integrationName ->
            val integration: Integration =
                mapper.readValue(FileResourceManagerTest::class.java.getResource(integrationName))

            rm.upsertIntegration(integration)
            val integrationAfterSaved = rm.getIntegrationByType(integration.type)

            integrationAfterSaved.let {
                it!!.id shouldBe integration.id
                it.workspaceId shouldBe integration.workspaceId
                it.configs shouldBe integration.configs
            }
        }
    }

    context("delete a integration.") {
        val integration1: Integration =
            mapper.readValue(FileResourceManagerTest::class.java.getResource("/integrations/integration_1.json"))
        val integration2: Integration =
            mapper.readValue(FileResourceManagerTest::class.java.getResource("/integrations/integration_2.json"))

        rm.upsertIntegration(integration1)
        rm.upsertIntegration(integration2)
        rm.deleteIntegration(integration1.id!!)

        val integrations = rm.getAllIntegrationByProfile("12345")
        integrations.size shouldBe 1
        integrations[0].let {
            it.id shouldBe integration2.id
            it.type shouldBe integration2.type
            it.configs shouldBe integration2.configs
        }
    }

    context("upsert the profile concurrency.") {
        val profile1: NewProfile =
            mapper.readValue(FileResourceManagerTest::class.java.getResource("/profiles/profile_1.json"))
        val profile2: NewProfile =
            mapper.readValue(FileResourceManagerTest::class.java.getResource("/profiles/profile_2.json"))

        (0 until 50 step 1)
            .map { async { rm.upsertProfile(if (it % 2 == 0) profile1 else profile2) } }
            .awaitAll()

        val profile = rm.getProfileById("")
        profile.let {
            it!!.type shouldBe profile2.type
            it.workspaceId shouldBe profile2.workspaceId
            it.configs shouldBe profile2.configs
        }
    }
})
