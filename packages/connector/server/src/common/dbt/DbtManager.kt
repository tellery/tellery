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
import com.google.common.base.Strings
import com.jcraft.jsch.JSch
import com.jcraft.jsch.KeyPair
import io.tellery.common.ConfigManager
import io.tellery.common.dbt.Constants.PROFILE_GIT_URL_FIELD
import io.tellery.common.dbt.GitUtils.checkoutMasterAndPull
import io.tellery.common.dbt.GitUtils.checkoutNewBranchAndCommitAndPush
import io.tellery.common.dbt.GitUtils.cloneRemoteRepo
import io.tellery.common.dbt.GitUtils.commitAndPush
import io.tellery.common.dbt.ProfileManager.batchToDbtProfile
import io.tellery.common.dbt.model.Manifest
import io.tellery.entities.Profile
import io.tellery.grpc.Block
import io.tellery.grpc.DbtBlock
import io.tellery.utils.logger
import org.apache.commons.io.FileUtils
import java.io.File

object DbtManager {

    private val rootFolder: File = File("/dbt")
    private val keyFolder: File = File("/dbt_key")
    private val profileFile: File = File("~/.dbt/profiles.yml")
    private val mapper = ObjectMapper(YAMLFactory()).registerModule(KotlinModule())
    private val jsonMapper = jacksonObjectMapper()

    init {
        initDbtWorkspace()
    }

    fun createRepo(name: String): String {
        val profile = getProfileByName(name)
            ?: throw RuntimeException("The profile is not exists, name: $name")

        assert(!Strings.isNullOrEmpty(profile.configs[PROFILE_GIT_URL_FIELD]))

        val repo = DbtRepository(rootFolder, keyFolder, profile)
        if (rootFolder.list()!!.contains(name)) {
            logger.warn { "$name repository is in root folder, so ignore creating this repository." }
            return generateRepoKeyPair(repo)
        }

        cloneRemoteRepo(repo)
        updateTelleryModelConfig(repo)
        return generateRepoKeyPair(repo)
    }

    fun removeRepo(name: String) {
        if (!rootFolder.list()!!.contains(name)) {
            logger.warn { "$name repository is not in root folder, so ignore removing this repository." }
            return
        }

        val repo = DbtRepository(name, rootFolder, keyFolder)
        FileUtils.deleteDirectory(repo.gitRepoFolder)
        FileUtils.deleteDirectory(repo.sshFolder)
    }

    fun pullRepo(name: String) {
        if (rootFolder.list()!!.contains(name)) {
            throw RuntimeException("$name repository is not exists.")
        }

        val repo = DbtRepository(name, rootFolder, keyFolder)
        checkoutMasterAndPull(repo)
    }

    fun pushRepo(name: String, id2Block: Map<String, Block>) {
        if (rootFolder.list()!!.contains(name)) {
            throw RuntimeException("$name repository is not exists.")
        }

        val repo = DbtRepository(name, rootFolder, keyFolder)
        checkoutMasterAndPull(repo)
        overwriteDiffModels(name, id2Block)
        checkoutNewBranchAndCommitAndPush(repo)
    }

    fun listBlocks(name: String): List<DbtBlock> {
        if (rootFolder.list()!!.contains(name)) {
            throw RuntimeException("$name repository is not exists.")
        }

        val repo = DbtRepository(name, rootFolder, keyFolder)
        Runtime.getRuntime().exec("cd ${repo.gitRepoFolder.absolutePath} && dbt compile")

        val manifestFile = File(repo.gitRepoFolder.absolutePath + "/target/manifest.json")
        return parseDbtBlocks(manifestFile)
    }

    fun initDbtWorkspace() {
        val profiles = ConfigManager.profiles
        reloadDbtProfiles(profiles)
        initDbtFolder(profiles)
    }

    fun reloadDbtProfiles(profiles: List<Profile>) {
        if (profiles.isEmpty()) {
            return
        }

        val dbtProfileContent = batchToDbtProfile(profiles)
        profileFile.writeText(dbtProfileContent)
    }

    @VisibleForTesting
    fun updateProjectConfig(projectConfig: JsonNode, name: String) {
        assert(projectConfig.has("models"))
        assert(projectConfig.get("models").has(name))

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
        updateProjectConfig(projectConfig, repo.name)

        checkoutMasterAndPull(repo)
        projectConfigFile.writeText(mapper.writeValueAsString(projectConfig))
        commitAndPush(repo, "Update the dbt_project.yml by tellery.")
    }

    private fun generateRepoKeyPair(repo: DbtRepository): String {
        if (repo.publicKey.exists() && repo.publicKey.exists()) {
            logger.warn { "The private key and public key are exists." }
            return repo.publicKey.readText()
        }

        if (!repo.sshFolder.exists()) {
            repo.sshFolder.mkdir()
        } else if (!repo.sshFolder.isDirectory) {
            repo.sshFolder.deleteOnExit()
            repo.sshFolder.mkdir()
        }

        val jsch = JSch()
        val keyPair = KeyPair.genKeyPair(jsch, KeyPair.RSA, 2048)
        keyPair.writePrivateKey(repo.privateKey.absolutePath)
        keyPair.writePublicKey(repo.publicKey.absolutePath, "")
        return repo.publicKey.readText();
    }

    private fun initDbtFolder(profiles: List<Profile>) {
        if (profiles.isEmpty()) {
            return
        }

        if (!rootFolder.exists()) {
            rootFolder.mkdir()
        } else if (!rootFolder.isDirectory) {
            rootFolder.delete()
            rootFolder.mkdir()
        }
        createRemoteRepos(profiles)
    }

    private fun createRemoteRepos(profiles: List<Profile>) {
        val repoFolders = rootFolder.list()!!

        profiles
            .filter { repoFolders.contains(it.name) && it.configs.containsKey(PROFILE_GIT_URL_FIELD) }
            .forEach { cloneRemoteRepo(DbtRepository(rootFolder, keyFolder, it)) }
    }

    private fun overwriteDiffModels(name: String, id2Block: Map<String, Block>) {
        val name2Block = id2Block.entries
            .map { getBlockName(it.value, id2Block[it.value.storyId]) to it.value }
            .toMap()

        val telleryModelFolder = File(rootFolder.absolutePath + "/$name/models/tellery")

        name2Block.entries.forEach {
            val sqlFile = File(telleryModelFolder, it.key)
            if (sqlFile.exists()) {
                val sqlContext = sqlFile.readText()
                if (sqlContext != it.value.content.sql) {
                    sqlFile.writeText(it.value.content.sql)
                }
            } else {
                sqlFile.writeText(it.value.content.sql)
            }
        }
    }

    private fun getBlockName(block: Block, storyBlock: Block?): String {
        val storyPrefix = storyBlock?.content?.title?.replace(" ", "_")?.toLowerCase() ?: ""
        return storyPrefix + "-" + block.content.title.replace(" ", "_").toLowerCase()
    }

    private fun getProfileByName(name: String): Profile? {
        return ConfigManager.profiles.map { it.name to it }.toMap()[name]
    }
}