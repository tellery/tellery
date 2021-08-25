package common.dbt

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.tellery.common.dbt.ProfileManager
import io.tellery.entities.Profile

class ProfileManagerTest : StringSpec({

    val mapper = jacksonObjectMapper()

    "get dbt profile from tellery profile" {
        val profiles: List<Profile> =
            mapper.readValue(ProfileManagerTest::class.java.getResource("/dbt_profiles.json"))

        val profilesYamlContent = ProfileManager.batchToDbtProfile(profiles)
        val expectYamlContent =
            ProfileManager::class.java.getResource("/dbt_profiles.yml").readText()

        profilesYamlContent shouldBe expectYamlContent
    }
})
