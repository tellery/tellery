package common.dbt

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.TextNode
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import io.tellery.common.dbt.DbtManager
import io.tellery.grpc.DbtBlock
import org.junit.jupiter.api.Test
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class DbtManagerTest {

    private val mapper: ObjectMapper =
        ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())

    @Test
    fun `add tellery model config`() {
        val projectConfig = mapper
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
        val projectConfig = mapper
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
}
