package io.tellery.common.dbt

import io.tellery.entities.Profile
import java.io.File

@Deprecated("")
data class DbtRepository(
    val name: String,
    val gitRepoFolder: File,
    val sshFolder: File,
    val privateKey: File,
    val publicKey: File,
    val gitUrl: String,
    val dbtProjectName: String,
    val profile: Profile
) {
    constructor(
        rootFolder: File,
        keyFolder: File,
        profile: Profile
    ) : this(
        name = profile.name,
        gitRepoFolder = File(rootFolder, profile.name),
        sshFolder = File(keyFolder, profile.name),
        privateKey = File(File(keyFolder, profile.name), "dbt_rsa"),
        publicKey = File(File(keyFolder, profile.name), "dbt_rsa.pub"),
        gitUrl = profile.configs[Constants.PROFILE_GIT_URL_FIELD] ?: "",
        dbtProjectName = profile.configs[Constants.PROFILE_DBT_PROJECT_FIELD] ?: "",
        profile = profile
    )
}
