package common.dbt

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.KotlinModule
import io.tellery.common.dbt.ProfileManager
import io.tellery.entities.Profile
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals

class ProfileManagerTest {

    private val mapper: ObjectMapper = ObjectMapper().registerModule(KotlinModule())

    @Test
    fun `get dbt profile from tellery profile`() {
        val profiles = mapper.readValue(
            ProfileManagerTest::class.java.getResource("/dbt_profiles.json"),
            object : TypeReference<List<Profile>>() {}
        )

        val profilesYamlContent = ProfileManager.batchToDbtProfile(profiles)
        val expectYamlContent =
            ProfileManager::class.java.getResource("/dbt_profiles.yml").readText()
        assertEquals(expectYamlContent, profilesYamlContent)
    }
}
