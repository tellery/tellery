package managers

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.fasterxml.jackson.module.kotlin.readValue
import com.google.protobuf.util.JsonFormat
import entities.Integration
import entities.NewProfile
import getResourceFileURL
import getResourceString
import io.kotest.common.ExperimentalKotest
import io.kotest.core.spec.style.FunSpec
import io.kotest.datatest.withData
import io.kotest.engine.spec.tempdir
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.collections.shouldNotContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import io.mockk.*
import io.tellery.grpc.DbtBlock
import io.tellery.grpc.QuestionBlockContent
import io.tellery.managers.DbtManagerV2
import io.tellery.managers.ProfileManager
import io.tellery.utils.GitUtilsV2
import org.apache.commons.io.FileUtils
import java.io.BufferedReader
import java.io.File
import java.io.FileReader
import kotlin.io.path.*
import entities.ProjectConfig as config

@OptIn(ExperimentalKotest::class)
class DbtManagerTest : FunSpec({
    val workspaceId = "1"
    val dir = tempdir()
    val profilePath = dir.resolve("profiles.yml")
    val mapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())
    val integration: Integration =
        mapper.readValue(getResourceFileURL("/integrations/integration_1.json"))

    val pm: ProfileManager = mockk()

    beforeSpec {
        mockkObject(config)
        every { config.workspaceId } answers { workspaceId }
        every { config.dbtGlobalRepoDir } answers { dir.toPath().resolve("dbt") }
        every { config.dbtKeyConfigDir } answers { dir.toPath().resolve("dbt_key") }
    }

    beforeTest {
        clearMocks(pm)
        dir.deleteRecursively()
        dir.mkdirs()
    }

    context("Should write the dbt profile to file after calling reloadContext function.") {
        val types = listOf(
            "bigquery",
            "postgresql",
            "redshift",
            "snowflake"
        )

        withData(
            nameFn = { t -> t },
            types
        ) { type ->
            val mockProfilePath = "/profiles/profile_${type}.json"
            val mockDbtProfilePath = "/dbt/profiles_${type}.yml"

            every { pm.getProfileById(workspaceId) } returns
                    mapper.readValue<NewProfile>(getResourceFileURL(mockProfilePath))
            every { pm.getIntegrationInProfileAndByType(workspaceId, "dbt") } returns integration

            val dbtManager = DbtManagerV2(pm)
            dbtManager.setDbtProfilePath(profilePath)
            dbtManager.reloadContext()

            val dbtProfile = dbtManager.getDbtProfileContent()!!.replace("\n", "")
            val dbtProfileExcept = getResourceString(mockDbtProfilePath).replace("\n", "")

            dbtProfile shouldBe dbtProfileExcept
            config.dbtGlobalRepoDir.exists() shouldBe true
            config.dbtKeyConfigDir.exists() shouldBe true
        }
    }

    context("Should not create dir and file while get no profile or integration.") {
        every { pm.getProfileById(workspaceId) } returns null
        every { pm.getIntegrationInProfileAndByType(workspaceId, "dbt") } returns null

        val dbtManager = DbtManagerV2(pm)
        dbtManager.setDbtProfilePath(profilePath)
        dbtManager.reloadContext()

        config.dbtGlobalRepoDir.exists() shouldBe false
        config.dbtKeyConfigDir.exists() shouldBe false
        dbtManager.getDbtProfileContent() shouldBe null
    }

    context("Should update the dbt project file after calling updateProjectCon function.") {
        val mockMap = mapOf(
            "/dbt/project_incomplete.yml" to 1,
            "/dbt/project_complete.yml" to 0
        )

        withData(
            nameFn = { t -> "${if (t.value == 1) "call" else "don't call"} commitAndPush" },
            mockMap.entries
        ) { (path, time) ->
            mockkObject(GitUtilsV2)
            every { GitUtilsV2.commitAndPush(any(), any(), any()) } returns mockk()
            every { GitUtilsV2.checkoutMasterAndPull(any(), any()) } returns mockk()

            every { pm.getProfileById(workspaceId) } returns
                    mapper.readValue<NewProfile>(getResourceFileURL("/profiles/profile_bigquery.json"))
            every { pm.getIntegrationInProfileAndByType(workspaceId, "dbt") } returns integration

            // mock env and data
            val dbtManager = DbtManagerV2(pm)
            dbtManager.reloadContext()
            val repoDir = dbtManager.getContext()?.repoDir!!
            FileUtils.forceMkdir(repoDir.toFile())
            val projectFilePath = repoDir.resolve("dbt_project.yml")
            projectFilePath.writeText(getResourceString(path))

            // call test function
            dbtManager.updateProjectConfig()

            // assert
            projectFilePath.readText() shouldContain "ephemeral"
            verify(exactly = time) { GitUtilsV2.commitAndPush(any(), any(), any()) }
        }
    }

    context("Should insert a block while the block was not there before.") {
        mockkObject(GitUtilsV2)
        every { GitUtilsV2.checkoutMasterAndPull(any(), any()) } returns mockk()
        every { GitUtilsV2.checkoutNewBranchAndCommitAndPush(any(), any(), any()) } returns mockk()

        every { pm.getProfileById(workspaceId) } returns
                mapper.readValue<NewProfile>(getResourceFileURL("/profiles/profile_bigquery.json"))
        every { pm.getIntegrationInProfileAndByType(workspaceId, "dbt") } returns integration

        // mock env and data
        val block = providesQuestionBlockContent("/dbt/question_block_latest.json")
        val dbtManager = DbtManagerV2(pm)
        dbtManager.reloadContext()
        val telleryDir = dbtManager.getContext()?.repoDir?.resolve("models/tellery")!!
        FileUtils.forceMkdir(telleryDir.toFile())

        // call test function
        dbtManager.pushRepo(listOf(block))

        // assert
        telleryDir.listDirectoryEntries().map { it.name } shouldContain "${block.name}.sql"
        verify(exactly = 1) {
            GitUtilsV2.checkoutNewBranchAndCommitAndPush(
                any(),
                any(),
                "feat(tellery): async model files in tellery dir.\ninsert ${block.name}.sql;\n"
            )
        }
    }

    context("Should update a block while the block has some changes.") {
        mockkObject(GitUtilsV2)
        every { GitUtilsV2.checkoutMasterAndPull(any(), any()) } returns mockk()
        every { GitUtilsV2.checkoutNewBranchAndCommitAndPush(any(), any(), any()) } returns mockk()

        every { pm.getProfileById(workspaceId) } returns
                mapper.readValue<NewProfile>(getResourceFileURL("/profiles/profile_bigquery.json"))
        every { pm.getIntegrationInProfileAndByType(workspaceId, "dbt") } returns integration

        // mock env and data
        val expireBlock = providesQuestionBlockContent("/dbt/question_block_expire.json")
        val latestBlock = providesQuestionBlockContent("/dbt/question_block_latest.json")
        val dbtManager = DbtManagerV2(pm)
        dbtManager.reloadContext()
        val telleryDir = dbtManager.getContext()?.repoDir?.resolve("models/tellery")!!
        FileUtils.forceMkdir(telleryDir.toFile())
        val blockPath = telleryDir.resolve("${expireBlock.name}.sql")
        blockPath.writeText(expireBlock.sql.toString())

        // call test function
        dbtManager.pushRepo(listOf(latestBlock))

        // assert
        telleryDir.listDirectoryEntries().map { it.name } shouldContain "${latestBlock.name}.sql"
        blockPath.readText() shouldBe latestBlock.sql.toString()
        verify(exactly = 1) {
            GitUtilsV2.checkoutNewBranchAndCommitAndPush(
                any(),
                any(),
                "feat(tellery): async model files in tellery dir.\nupdate ${latestBlock.name}.sql;\n"
            )
        }
    }

    context("Should delete the block while the block isn't exist.") {
        mockkObject(GitUtilsV2)
        every { GitUtilsV2.checkoutMasterAndPull(any(), any()) } returns mockk()
        every { GitUtilsV2.checkoutNewBranchAndCommitAndPush(any(), any(), any()) } returns mockk()

        every { pm.getProfileById(workspaceId) } returns
                mapper.readValue<NewProfile>(getResourceFileURL("/profiles/profile_bigquery.json"))
        every { pm.getIntegrationInProfileAndByType(workspaceId, "dbt") } returns integration

        // mock env and data
        val block = providesQuestionBlockContent("/dbt/question_block_latest.json")
        val dbtManager = DbtManagerV2(pm)
        dbtManager.reloadContext()
        val telleryDir = dbtManager.getContext()?.repoDir?.resolve("models/tellery")!!
        FileUtils.forceMkdir(telleryDir.toFile())
        val blockPath = telleryDir.resolve("${block.name}.sql")
        blockPath.writeText(block.sql.toString())

        // call test function
        dbtManager.pushRepo(listOf())

        // assert
        telleryDir.listDirectoryEntries().map { it.name } shouldNotContain "${block.name}.sql"
        verify(exactly = 1) {
            GitUtilsV2.checkoutNewBranchAndCommitAndPush(
                any(),
                any(),
                "feat(tellery): async model files in tellery dir.\ndelete ${block.name}.sql;\n"
            )
        }
    }

    context("Should get all models and sources after calling parseDbtBlocks.") {
        every { pm.getProfileById(workspaceId) } returns
                mapper.readValue<NewProfile>(getResourceFileURL("/profiles/profile_bigquery.json"))
        every { pm.getIntegrationInProfileAndByType(workspaceId, "dbt") } returns integration

        // mock env and data
        val dbtManager = DbtManagerV2(pm)
        dbtManager.reloadContext()
        val manifestPath = dbtManager.getContext()?.repoDir?.resolve("target/manifest.json")!!
        val mockManifestString = getResourceString("/dbt/manifest.json")
        FileUtils.forceMkdirParent(manifestPath.toFile())
        manifestPath.createFile()
        manifestPath.writeText(mockManifestString)

        // call test function
        val blocks = dbtManager.parseDbtBlocks()

        // assert
        blocks.count { it.type == DbtBlock.Type.MODEL } shouldBe 1
        blocks.count { it.type == DbtBlock.Type.SOURCE } shouldBe 2
        blocks.first { it.type == DbtBlock.Type.MODEL }.let {
            it.name shouldBe "my_second_dbt_model"
            it.uniqueId shouldBe "model.jaffle_shop.my_second_dbt_model"
            it.description shouldBe "A starter dbt model"
            it.relationName shouldBe "`mythic-hulling-307909`.`dbt_bob`.`my_second_dbt_model`"
            it.rawSql shouldBe "-- Use the `ref` function to select from other models\n\nselect *\nfrom {{ ref(\'my_first_dbt_model\') }}\nwhere id = 1"
            it.compiledSql shouldBe "-- Use the `ref` function to select from other models\n\nselect *\nfrom `mythic-hulling-307909`.`dbt_bob`.`my_first_dbt_model`\nwhere id = 1"
            it.materialized shouldBe DbtBlock.Materialization.VIEW
        }

        blocks.first { it.type == DbtBlock.Type.SOURCE }.let {
            it.name shouldBe "orders"
            it.uniqueId shouldBe "source.jaffle_shop.jaffle_shop.orders"
            it.relationName shouldBe "raw.public.Orders_"
            it.sourceName shouldBe "jaffle_shop"
        }
    }
})

fun providesQuestionBlockContent(path: String): QuestionBlockContent {
    val url = getResourceFileURL(path)
    val bufferedReader = BufferedReader(FileReader(File(url.toURI())))
    val builder = QuestionBlockContent.newBuilder()
    JsonFormat.parser().ignoringUnknownFields().merge(bufferedReader, builder)
    return builder.build()
}