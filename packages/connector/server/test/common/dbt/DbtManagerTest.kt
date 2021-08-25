package common.dbt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.TextNode
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.google.protobuf.util.JsonFormat
import io.kotest.core.spec.style.StringSpec
import io.kotest.engine.spec.tempdir
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.tellery.common.dbt.DbtManager
import io.tellery.grpc.DbtBlock
import io.tellery.grpc.QuestionBlockContent
import org.apache.commons.io.FileUtils
import java.io.BufferedReader
import java.io.File
import java.io.FileReader


class DbtManagerTest : StringSpec({

    val dir = tempdir()
    val mapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())

    "add tellery model config" {
        val projectConfig = mapper
            .readTree(DbtManagerTest::class.java.getResource("/dbt_project_1.yml"))

        DbtManager.updateProjectConfig(projectConfig, "jaffle_shop")

        (projectConfig
            .get("models")
            .get("jaffle_shop")
            .get("tellery")
            .get("materialized") as TextNode).asText() shouldBe "ephemeral"
    }

    "update tellery model config" {
        val projectConfig = mapper
            .readTree(DbtManagerTest::class.java.getResource("/dbt_project_2.yml"))

        DbtManager.updateProjectConfig(projectConfig, "jaffle_shop")

        (projectConfig
            .get("models")
            .get("jaffle_shop")
            .get("tellery")
            .get("materialized") as TextNode).asText() shouldBe "ephemeral"
    }

    "parse dbt model blocks and source blocks" {
        val manifestFile = File(DbtManagerTest::class.java.getResource("/manifest.json").toURI())
        val blocks = DbtManager.parseDbtBlocks(manifestFile)
        val blockMap = blocks.associateBy { it.name }

        blockMap.containsKey("model.jaffle_shop.my_first_dbt_model") shouldBe false
        blocks.size shouldBe 3

        blockMap["my_second_dbt_model"]!!.let {
            it.relationName shouldBe "`mythic-hulling-307909`.`dbt_bob`.`my_second_dbt_model`"
            it.materialized shouldBe DbtBlock.Materialization.VIEW
            it.description shouldBe "A starter dbt model"
        }

        blockMap["orders"]!!.let {
            it.relationName shouldBe "raw.public.Orders_"
            it.materialized shouldBe DbtBlock.Materialization.UNKNOWN
            it.description shouldBe ""
            it.sourceName shouldBe "jaffle_shop"
        }
    }

    "overwrite and remove diff models" {
        val repositoryName = "test"
        val modelFolder = File(dir, "/$repositoryName/models/tellery")
        FileUtils.forceMkdir(modelFolder)

        for (i in 1..3) {
            if (i == 2) {
                continue
            }
            val file = File(modelFolder, "welcome_to tellery-dbt-block-$i.sql")
            file.createNewFile()
            file.writeText("test")
        }

        DbtManager.updateRootFolder(dir)

        val blocks = mutableListOf<QuestionBlockContent>()
        for (i in 1..2) {
            val file =
                File(DbtManagerTest::class.java.getResource("/question_block_$i.json").toURI())
            val bufferedReader = BufferedReader(FileReader(file))
            val builder = QuestionBlockContent.newBuilder()
            JsonFormat.parser().ignoringUnknownFields().merge(bufferedReader, builder)
            blocks.add(builder.build())
        }

        DbtManager.overwriteDiffModels(repositoryName, blocks)

        val files = modelFolder.listFiles()!!
        files.sortBy { it.name }
        files.size shouldBe 2

        files[0].let {
            it.name shouldBe "welcome_to tellery-dbt-block-1.sql"
            it.readText() shouldNotBe "test"
        }

        files[1].let {
            it.name shouldBe "welcome_to tellery-dbt-block-2.sql"
        }
    }
})
