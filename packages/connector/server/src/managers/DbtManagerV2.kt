package io.tellery.managers

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
import entities.Integration
import entities.NewProfile
import io.grpc.Status
import io.tellery.common.assertInternalError
import io.tellery.common.dbt.Constants
import io.tellery.common.dbt.model.Manifest
import io.tellery.entities.CustomizedException
import io.tellery.grpc.DbtBlock
import io.tellery.grpc.QuestionBlockContent
import io.tellery.integrations.BaseDbtProfile
import io.tellery.integrations.DbtIntegration
import io.tellery.integrations.Type
import io.tellery.utils.GitUtilsV2.checkoutMasterAndPull
import io.tellery.utils.GitUtilsV2.checkoutNewBranchAndCommitAndPush
import io.tellery.utils.GitUtilsV2.cloneRemoteRepo
import io.tellery.utils.GitUtilsV2.commitAndPush
import io.tellery.utils.allSubclasses
import mu.KotlinLogging
import org.apache.commons.io.FileUtils
import org.jetbrains.annotations.TestOnly
import java.io.BufferedReader
import java.io.File
import java.io.InputStream
import java.io.InputStreamReader
import java.nio.file.Path
import java.util.concurrent.Executors
import java.util.concurrent.locks.ReentrantReadWriteLock
import java.util.function.Consumer
import kotlin.concurrent.read
import kotlin.concurrent.write
import kotlin.io.path.*
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.hasAnnotation
import kotlin.reflect.full.primaryConstructor
import entities.ProjectConfig as config

class DbtManagerV2(private val profileManager: ProfileManager) {
    private val lock = ReentrantReadWriteLock()
    private val dbtIntegrationTypeToClass = DbtIntegration::class.allSubclasses
        .filter { it.hasAnnotation<Type>() }
        .associateBy { it.findAnnotation<Type>()!!.value }

    /**
     * Connector and context are a read more write fewer resources, so we store the state in memory
     * to replace requesting from the database every time.
     * Dbt profile file is a resource that needs to be async with the latest profile, and it is base
     * on the file system, so we need to get a write lock before update it.
     *
     * In summary, we require a read-write lock in this class, get write lock when reload context and
     * get read lock when do other dbt operate.
     */
    private var connector: NewProfile? = null
    private var context: Context? = null
    private var profileFile = File(System.getProperty("user.home") + "/.dbt/profiles.yml")

    companion object {
        private val yamlMapper =
            ObjectMapper(YAMLFactory()).registerModule(KotlinModule.Builder().build())
        private val jsonMapper = jacksonObjectMapper()
        private val logger = KotlinLogging.logger {}
    }

    fun reloadContext() = lock.write {
        val globalRepoDir = config.dbtGlobalRepoDir
        val keyDir = config.dbtKeyConfigDir
        val profile = profileManager.getProfileById(config.workspaceId)
        val integration = profileManager.getIntegrationInProfileAndByType(config.workspaceId, "dbt")

        if (profile == null || integration == null) {
            logger.warn { "Can not init the dbt manager, maybe the workspace have no profile or dbt integration." }
            return
        }

        connector = profile
        context = Context(globalRepoDir, keyDir, integration)

        /**
         * FileUtils.forceMkdir() ignores the situation that dir is exists;
         * File.createNewFile() returns false while the file is exists;
         * so it needn't to check the file is exists.
         */
        FileUtils.forceMkdir(globalRepoDir.toFile())
        FileUtils.forceMkdir(keyDir.toFile())
        FileUtils.forceMkdirParent(profileFile)
        profileFile.createNewFile()

        reloadDbtProfile()
    }

    fun generateKeyPair(): String = lock.read {
        context?.let {
            if (it.publicKey.exists()) {
                return it.publicKey.readText()
            }

            FileUtils.forceMkdir(it.sshKeyDir.toFile())
            val jsch = JSch()
            val keyPair = KeyPair.genKeyPair(jsch, KeyPair.RSA, 2048)
            keyPair.writePrivateKey(it.privateKey.absolutePathString())
            keyPair.writePublicKey(it.publicKey.absolutePathString(), "")
            return it.publicKey.readText()
        } ?: run {
            throw DbtContextNotInitException()
        }
    }

    fun pullRepo() = lock.read {
        context?.let {
            if (!it.repoDir.exists()) {
                try {
                    cloneRemoteRepo(it.repoDir, it.gitUrl, it.privateKey)
                } catch (ex: Exception) {
                    logger.error("Clone repository meeting some problem.", ex)
                    it.repoDir.deleteIfExists()
                }
                updateProjectConfig()
            }
            checkoutMasterAndPull(it.repoDir, it.privateKey)
        } ?: run {
            throw DbtContextNotInitException()
        }
    }

    fun pushRepo(blocks: List<QuestionBlockContent>) = lock.read {
        context?.let {
            if (!it.repoDir.exists()) {
                throw DbtRepositoryNotExistsException()
            }

            checkoutMasterAndPull(it.repoDir, it.privateKey)
            val commitMessage = overwriteDiffModels(blocks)
            checkoutNewBranchAndCommitAndPush(it.repoDir, it.privateKey, commitMessage)
        } ?: run {
            throw DbtContextNotInitException()
        }
    }

    fun listBlocks(): List<DbtBlock> = lock.read {
        context?.let {
            if (!it.repoDir.exists()) {
                throw DbtRepositoryNotExistsException()
            }

            val process = Runtime.getRuntime().exec("dbt compile", null, it.repoDir.toFile())
            val streamGobbler = StreamGobbler(process.inputStream) { line -> logger.debug(line) }
            Executors.newSingleThreadExecutor().submit(streamGobbler)
            val exitCode = process.waitFor()
            assertInternalError(exitCode == 0) { "The dbt command execution failed: dbt compile." }
            return parseDbtBlocks()
        } ?: run {
            throw DbtContextNotInitException()
        }
    }

    /**
     * Parse the manifest file in project, the dbt block is composed of models and sources.
     * (NOTE: the models should exclude all models in tellery dir)
     *
     * example:
     * {
     *   "nodes": {
     *      "model.tellery_dbt_demo.tellery_with_dbt-product_category_total_sales": {
     *          "resource_type": "model",
     *          ...
     *      },
     *      "test.tellery_dbt_demo.unique_product_order_model_id.63bdd74d04": {
     *          "resource_type": "test",
     *          ...
     *      }
     *   },
     *   "sources": {
     *      "source.tellery_dbt_demo.public.orders": {
     *          "resource_type": "source",
     *          ...
     *      }
     *   }
     */
    @VisibleForTesting
    fun parseDbtBlocks(): List<DbtBlock> {
        val manifestFile = context?.repoDir?.resolve("target/manifest.json")
            ?: throw DbtContextNotInitException()
        val manifest: Manifest = jsonMapper.readValue(manifestFile.toFile())

        val models = manifest.nodes.values.filter {
            it.config.enabled
                    && it.resourceType == "model"
                    && it.path != null
                    && !it.path.startsWith("tellery/")
        }.map { it.toDbtBlock() }

        val sources = manifest.sources.values.filter {
            it.config.enabled && it.resourceType == "source"
        }.map { it.toDbtBlock() }

        return models + sources
    }

    /**
     * Insure the "dbt_project.yml" file has the valid "model" node,
     * if it need update the project file, the function will push the diff to remote repository after updating file.
     *
     * The "tellery" file must be in the "model" node, and the value must be 'materialized: "ephemeral"',
     * the settings can make "dbt compile" command ignore the tellery folder during the compilation process.
     *
     * A example:
     *
     * models:
     *  tellery_dbt_demo:
     *    example:
     *      materialized: "view"
     *    tellery:
     *      materialized: "ephemeral"
     */
    @VisibleForTesting
    fun updateProjectConfig() = context?.let { c ->
        val name = c.name
        val configFile = c.repoDir.resolve("dbt_project.yml")
        val configJsonNode = yamlMapper.readTree(configFile.toFile())

        val hasChange = configJsonNode.let {
            assertInternalError(
                it.has("models")
            ) { "The models field is not in project config." }

            assertInternalError(
                it.get("models").has(name)
            ) { "The $name module is not in models folder." }

            val modelNode = it.get("models").get(name) as ObjectNode
            val materializedNode = ObjectNode(
                JsonNodeFactory.instance,
                mapOf("materialized" to TextNode("ephemeral"))
            )

            if (!modelNode.has("tellery")
                || !modelNode.get("tellery").has("materialized")
                || modelNode.get("tellery").get("materialized").textValue() != "ephemeral"
            ) {
                modelNode.set<ObjectNode>("tellery", materializedNode)
                true
            } else {
                false
            }
        }

        if (hasChange) {
            checkoutMasterAndPull(c.repoDir, c.privateKey)
            overwriteFile(configFile, yamlMapper.writeValueAsString(configJsonNode))
            commitAndPush(
                c.repoDir,
                c.privateKey,
                "feat(tellery): update dbt_project.yml"
            )
        }
    } ?: throw DbtContextNotInitException()

    private fun reloadDbtProfile() = connector?.let {
        val clazz = dbtIntegrationTypeToClass[it.type]
            ?: throw RuntimeException("The type(${it.type}) is not supported in dbt integration.")
        val dbtIntegration = clazz.primaryConstructor!!.call()
        val dbtProfileMap =
            mapOf(context!!.name to Entity(Output(dbtIntegration.transformToDbtProfile(it))))
        overwriteFile(profileFile.toPath(), yamlMapper.writeValueAsString(dbtProfileMap))
    } ?: throw DbtContextNotInitException()

    /**
     * Async model files in tellery dir with blocks parameter, and return commit message.
     * (NOTE: Connector just overwrite the model files in tellery dir.)
     */
    private fun overwriteDiffModels(blocks: List<QuestionBlockContent>): String {
        val telleryModelDir =
            context?.repoDir?.resolve("models/tellery") ?: throw DbtContextNotInitException()
        FileUtils.forceMkdir(telleryModelDir.toFile())

        val insertFiles: MutableList<String> = listOf<String>().toMutableList()
        val updateFiles: MutableList<String> = listOf<String>().toMutableList()
        val deleteFiles: MutableList<String> = listOf<String>().toMutableList()

        // Upsert SQL files.
        blocks.forEach { b ->
            val sqlFilePath = telleryModelDir.resolve("${b.name}.sql")
            if (sqlFilePath.exists()) {
                if (sqlFilePath.readText() != b.sql) {
                    updateFiles.add(sqlFilePath.name)
                    overwriteFile(sqlFilePath, b.sql)
                }
            } else {
                insertFiles.add(sqlFilePath.name)
                overwriteFile(sqlFilePath, b.sql)
            }
        }

        // Remove redundant SQL files.
        val blockFileNames = blocks.map { "${it.name}.sql" }
        telleryModelDir.listDirectoryEntries().forEach { f ->
            if (!blockFileNames.contains(f.name)) {
                deleteFiles.add(f.name)
                f.deleteIfExists()
            }
        }

        val sb = StringBuilder("feat(tellery): async model files in tellery dir.\n")
        if (insertFiles.isNotEmpty()) {
            sb.append("insert ${insertFiles.joinToString(",")};\n")
        }
        if (updateFiles.isNotEmpty()) {
            sb.append("update ${updateFiles.joinToString(",")};\n")
        }
        if (deleteFiles.isNotEmpty()) {
            sb.append("delete ${deleteFiles.joinToString(",")};\n")
        }
        return sb.toString()
    }

    private fun overwriteFile(path: Path, content: String) = path.let {
        if (!it.exists()) it.createFile()
        it.writeText(content)
    }

    @TestOnly
    fun getDbtProfileContent(): String? {
        return if (profileFile.exists()) profileFile.readText() else null
    }

    @TestOnly
    fun setDbtProfilePath(path: File) {
        profileFile = path
    }

    @TestOnly
    fun getContext(): Context? {
        return context
    }

    data class Context(
        val name: String,
        val repoDir: Path,
        val sshKeyDir: Path,
        val privateKey: Path,
        val publicKey: Path,
        val gitUrl: String,
    ) {
        constructor(
            globalRepoDir: Path,
            keyDir: Path,
            integration: Integration
        ) : this(
            name = integration.configs[Constants.PROFILE_DBT_PROJECT_FIELD]!!,
            repoDir = globalRepoDir.resolve(integration.configs[Constants.PROFILE_DBT_PROJECT_FIELD]!!),
            sshKeyDir = keyDir.resolve(integration.configs[Constants.PROFILE_DBT_PROJECT_FIELD]!!),
            privateKey = keyDir
                .resolve(integration.configs[Constants.PROFILE_DBT_PROJECT_FIELD]!!)
                .resolve("dbt_rsa"),
            publicKey = keyDir
                .resolve(integration.configs[Constants.PROFILE_DBT_PROJECT_FIELD]!!)
                .resolve("dbt_rsa.pub"),
            gitUrl = integration.configs[Constants.PROFILE_GIT_URL_FIELD]!!,
        )
    }

    /**
     * serialize dbt profile yml
     */
    data class Entity(val outputs: Output, val target: String = "dev")
    data class Output(val dev: BaseDbtProfile)

    private class StreamGobbler(
        val inputStream: InputStream,
        val consumer: Consumer<String>
    ) : Runnable {
        override fun run() {
            BufferedReader(InputStreamReader(inputStream)).lines().forEach(consumer)
        }
    }
}

class DbtContextNotInitException :
    CustomizedException("The dbt context is not init, so can not call functions in DbtManager.")

class DbtRepositoryNotExistsException :
    CustomizedException(
        "There isn't dbt repository, you should pull the repository first.",
        Status.FAILED_PRECONDITION
    )
