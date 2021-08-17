package common.dbt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.TextNode
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.google.protobuf.util.JsonFormat
import io.tellery.common.dbt.DbtManager
import io.tellery.grpc.DbtBlock
import io.tellery.grpc.QuestionBlockContent
import org.apache.commons.io.FileUtils
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.BufferedReader
import java.io.File
import java.io.FileReader
import java.nio.file.Path
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals


class DbtManagerTest {

    private val yamlMapper: ObjectMapper =
        ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())

    @Test
    fun `add tellery model config`() {
        val projectConfig = yamlMapper
            .readTree(DbtManagerTest::class.java.getResource("/dbt_project_1.yml"))

        DbtManager.updateProjectConfig(projectConfig, "jaffle_shop")

        assertEquals(
            "ephemeral",
            (projectConfig
                .get("models")
                .get("jaffle_shop")
                .get("tellery")
                .get("materialized") as TextNode).asText()
        )
    }

    @Test
    fun `update tellery model config`() {
        val projectConfig = yamlMapper
            .readTree(DbtManagerTest::class.java.getResource("/dbt_project_2.yml"))

        DbtManager.updateProjectConfig(projectConfig, "jaffle_shop")

        assertEquals(
            "ephemeral",
            (projectConfig
                .get("models")
                .get("jaffle_shop")
                .get("tellery")
                .get("materialized") as TextNode).asText()
        )
    }

    @Test
    fun `parse dbt model blocks and source blocks`() {
        val manifestFile = File(DbtManagerTest::class.java.getResource("/manifest.json").toURI())

        val blocks = DbtManager.parseDbtBlocks(manifestFile)
        val blockMap = blocks.associateBy { it.name }

        assertFalse(blockMap.containsKey("model.jaffle_shop.my_first_dbt_model"))
        assertEquals(3, blocks.size)

        val model = blockMap["my_second_dbt_model"]!!
        assertEquals("`mythic-hulling-307909`.`dbt_bob`.`my_second_dbt_model`", model.relationName)
        assertEquals(DbtBlock.Materialization.VIEW, model.materialized)
        assertEquals("A starter dbt model", model.description)

        val source = blockMap["orders"]!!
        assertEquals("raw.public.Orders_", source.relationName)
        assertEquals(DbtBlock.Materialization.UNKNOWN, source.materialized)
        assertEquals("", source.description)
        assertEquals("jaffle_shop", source.sourceName)
    }

    @Test
    fun `overwrite and remove diff models`(@TempDir tempDir: Path) {
        val repositoryName = "test"
        val modelFolder = File(tempDir.toFile(), "/$repositoryName/models/tellery")
        FileUtils.forceMkdir(modelFolder)

        // Mock SQL file 1 and SQL file 3
        for (i in 1..3) {
            if (i == 2) {
                continue
            }
            val file = File(modelFolder, "welcome_to tellery-dbt-block-$i.sql")
            file.createNewFile()
            file.writeText("test")
        }

        DbtManager.updateRootFolder(tempDir.toFile())

        // Load blocks
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
        assertEquals(2, files.size)
        assertEquals("welcome_to tellery-dbt-block-1.sql", files[0].name)
        assertEquals("welcome_to tellery-dbt-block-2.sql", files[1].name)
        assertNotEquals("test", files[0].readText())
    }
}
