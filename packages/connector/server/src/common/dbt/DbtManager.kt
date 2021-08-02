package io.tellery.common.dbt

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.JsonNodeFactory
import com.fasterxml.jackson.databind.node.ObjectNode
import com.fasterxml.jackson.databind.node.TextNode
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.google.common.annotations.VisibleForTesting
import com.jcraft.jsch.JSch
import com.jcraft.jsch.KeyPair
import com.typesafe.config.ConfigFactory
import io.tellery.common.ConfigManager
import io.tellery.common.assertInternalError
import io.tellery.common.dbt.Constants.EXTERNAL_CONFIG_FIELDS
import io.tellery.common.dbt.GitUtils.checkoutMasterAndPull
import io.tellery.common.dbt.GitUtils.checkoutNewBranchAndCommitAndPush
import io.tellery.common.dbt.GitUtils.cloneRemoteRepo
import io.tellery.common.dbt.GitUtils.commitAndPush
import io.tellery.common.dbt.ProfileManager.batchToDbtProfile
import io.tellery.common.dbt.model.Manifest
import io.tellery.entities.DBTProfileNotConfiguredException
import io.tellery.entities.DBTRepositoryNotExistsException
import io.tellery.entities.Profile
import io.tellery.grpc.DbtBlock
import io.tellery.grpc.QuestionBlockContent
import io.tellery.utils.logger
import org.apache.commons.io.FileUtils
import java.io.BufferedReader
import java.io.File
import java.io.InputStream
import java.io.InputStreamReader
import java.util.*
import java.util.concurrent.Executors
import java.util.function.Consumer


object DbtManager {

    private val rootFolder: File
    private val keyFolder: File
    private val profileFile: File = File(System.getProperty("user.home") + "/.dbt/profiles.yml")
    private val mapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule())
    private val jsonMapper = jacksonObjectMapper()

    init {
        val appConfig = ConfigFactory.load()
        rootFolder = File(
            appConfig.getString("dbt.repoFolderPath")
                ?: throw DBTProfileNotConfiguredException()
        )
        keyFolder = File(
            appConfig.getString("dbt.keyFolderPath")
                ?: throw DBTProfileNotConfiguredException()
        )

        initDbtWorkspace()
    }

    fun createRepo(name: String): String {
        val repo = DbtRepository(rootFolder, keyFolder, getProfileByName(name))
        if (repoIsAlreadyExists(name)) {
            logger.warn { "$name repository is in root folder, so ignore creating this repository." }
            return generateRepoKeyPair(repo)
        }

        val publicKey = generateRepoKeyPair(repo)
        cloneRemoteRepo(repo)
        updateTelleryModelConfig(repo)
        return publicKey
    }

    fun removeRepo(name: String) {
        if (!repoIsAlreadyExists(name)) {
            logger.warn { "$name repository is not in root folder, so ignore removing this repository." }
            return
        }

        val repo = DbtRepository(rootFolder, keyFolder, getProfileByName(name))
        FileUtils.deleteDirectory(repo.gitRepoFolder)
        FileUtils.deleteDirectory(repo.sshFolder)
    }

    fun pullRepo(name: String) {
        if (!repoIsAlreadyExists(name)) {
            throw DBTRepositoryNotExistsException(name)
        }

        val repo = DbtRepository(rootFolder, keyFolder, getProfileByName(name))
        checkoutMasterAndPull(repo)
    }

    fun pushRepo(name: String, blocks: List<QuestionBlockContent>) {
        if (!repoIsAlreadyExists(name)) {
            throw DBTRepositoryNotExistsException(name)
        }

        if (blocks.isEmpty()) {
            return
        }

        val repo = DbtRepository(rootFolder, keyFolder, getProfileByName(name))
        checkoutMasterAndPull(repo)
        overwriteDiffModels(name, blocks)
        checkoutNewBranchAndCommitAndPush(repo)
    }

    fun listBlocks(name: String): List<DbtBlock> {
        if (!repoIsAlreadyExists(name)) {
            throw DBTRepositoryNotExistsException(name)
        }

        val repo = DbtRepository(rootFolder, keyFolder, getProfileByName(name))
        val process =
            Runtime.getRuntime().exec("dbt compile", null, File(repo.gitRepoFolder.absolutePath))
        val streamGobbler = StreamGobbler(process.inputStream) { logger.info(it) }
        Executors.newSingleThreadExecutor().submit(streamGobbler)
        val exitCode = process.waitFor()
        assertInternalError(exitCode == 0) { "The dbt command execution failed: dbt compile." }

        val manifestFile = File(repo.gitRepoFolder.absolutePath + "/target/manifest.json")
        return parseDbtBlocks(manifestFile)
    }

    fun initDbtWorkspace() {
        forceMkdir(rootFolder)
        forceMkdir(keyFolder)

        val profiles = ConfigManager.profiles
        reloadDbtProfiles(profiles)

        if (profiles.isNotEmpty()) {
            createRemoteRepos(profiles)
        }
    }

    fun reloadDbtProfiles(profiles: List<Profile>) {
        if (profiles.isEmpty()) {
            return
        }

        val dbtProfileContent = batchToDbtProfile(profiles)
        overwriteFile(profileFile, dbtProfileContent)
    }

    @VisibleForTesting
    fun updateProjectConfig(projectConfig: JsonNode, name: String) {
        assertInternalError(
            projectConfig.has("models")
        ) { "The models field is not in project config." }

        assertInternalError(
            projectConfig.get("models").has(name)
        ) { "The $name module is not in models folder." }

        val projectModelNode = projectConfig.get("models").get(name) as ObjectNode
        val materializedNode = ObjectNode(
            JsonNodeFactory.instance,
            mapOf("materialized" to TextNode("ephemeral"))
        )

        if (!projectModelNode.has("tellery")) {
            projectModelNode.set<ObjectNode>("tellery", materializedNode)
        } else if (!projectModelNode.get("tellery").has("materialized")) {
            (projectModelNode.get("tellery") as ObjectNode).set<TextNode>(
                "materialized",
                TextNode("ephemeral")
            )
        } else {
            (projectModelNode.get("tellery") as ObjectNode).replace(
                "materialized",
                TextNode("ephemeral")
            )
        }
    }

    @VisibleForTesting
    fun parseDbtBlocks(manifestFile: File): List<DbtBlock> {
        val manifest: Manifest = jsonMapper.readValue(manifestFile)

        val models = manifest.nodes.values
            .filter { it.config.enabled && it.resourceType == "model" }
            .map { it.toDbtBlock() }

        val sources = manifest.sources.values
            .filter { it.config.enabled }
            .map { it.toDbtBlock() }

        return models + sources
    }

    private fun updateTelleryModelConfig(repo: DbtRepository) {
        val projectConfigFile = File(repo.gitRepoFolder, "dbt_project.yml");
        val projectConfig = mapper.readTree(projectConfigFile)
        updateProjectConfig(
            projectConfig,
            repo.profile.configs[Constants.PROFILE_DBT_PROJECT_FIELD]!!
        )

        checkoutMasterAndPull(repo)
        overwriteFile(projectConfigFile, mapper.writeValueAsString(projectConfig))
        commitAndPush(repo, "Update the dbt_project.yml by tellery.")
    }

    private fun generateRepoKeyPair(repo: DbtRepository): String {
        if (repo.publicKey.exists() && repo.publicKey.exists()) {
            logger.warn { "The private key and public key are exists." }
            return repo.publicKey.readText()
        }

        forceMkdir(repo.sshFolder)

        val jsch = JSch()
        val keyPair = KeyPair.genKeyPair(jsch, KeyPair.RSA, 2048)
        keyPair.writePrivateKey(repo.privateKey.absolutePath)
        keyPair.writePublicKey(repo.publicKey.absolutePath, "")
        return repo.publicKey.readText()
    }

    private fun createRemoteRepos(profiles: List<Profile>) {
        val repoFolders = rootFolder.list() ?: Collections.emptyList<String>().toTypedArray()
        val keyFolders = keyFolder.list() ?: Collections.emptyList<String>().toTypedArray()

        profiles
            .filter { !keyFolders.contains(it.name) && isDbtProfile(it) }
            .forEach { generateRepoKeyPair(DbtRepository(rootFolder, keyFolder, it)) }

        profiles
            .filter { !repoFolders.contains(it.name) && isDbtProfile(it) }
            .forEach {
                val repo = DbtRepository(rootFolder, keyFolder, it)
                cloneRemoteRepo(repo)
                updateTelleryModelConfig(repo)
            }
    }

    private fun overwriteDiffModels(name: String, blocks: List<QuestionBlockContent>) {
        val telleryModelFolder = File(rootFolder.absolutePath + "/$name/models/tellery")
        forceMkdir(telleryModelFolder)

        blocks.forEach { b ->
            val sqlFile = File(telleryModelFolder, "${b.name}.sql")
            if (sqlFile.exists()) {
                val sqlContext = sqlFile.readText()
                if (sqlContext != b.sql) {
                    overwriteFile(sqlFile, b.sql)
                }
            } else {
                overwriteFile(sqlFile, b.sql)
            }
        }
    }

    private fun getProfileByName(name: String): Profile {
        val profile = ConfigManager.profiles.map { it.name to it }.toMap()[name]
            ?: throw RuntimeException("The profile is not exists, name: $name")

        assertInternalError(isDbtProfile(profile)) { "The profile is not a dbt profile." }
        return profile
    }

    private fun forceMkdir(folder: File) {
        if (!folder.exists()) {
            FileUtils.forceMkdir(folder)
        } else if (!folder.isDirectory) {
            FileUtils.delete(folder)
            FileUtils.forceMkdir(folder)
        }
    }

    private fun repoIsAlreadyExists(name: String): Boolean {
        val fileList = rootFolder.list() ?: Collections.emptyList<String>().toTypedArray()
        return fileList.contains(name)
    }

    private fun overwriteFile(file: File, content: String) {
        if (!file.exists()) {
            file.createNewFile()
        }
        file.writeText(content)
    }

    private fun isDbtProfile(profile: Profile): Boolean {
        return EXTERNAL_CONFIG_FIELDS
            .map { profile.configs.containsKey(it) }
            .reduce { acc, b -> acc && b }
    }

    private class StreamGobbler(
        val inputStream: InputStream,
        val consumer: Consumer<String>
    ) : Runnable {
        override fun run() {
            BufferedReader(InputStreamReader(inputStream))
                .lines().forEach(consumer)
        }
    }
}
