package io.tellery.entities

import com.typesafe.config.ConfigFactory
import java.nio.file.Path
import kotlin.io.path.Path

object ProjectConfig {

    private val appConfig = ConfigFactory.load()
    private val env = System.getenv()

    val port: Int
        get() = env.getOrDefault("server.port", "50051").toInt()

    val credCertPath: String?
        get() = env["server.credential.certificate"]

    val credKeyPath: String?
        get() = env["server.credential.key"]

    val deployModel: DeployModel
        get() = DeployModel.valueOf(
            env.getOrDefault(
                "connector.deployModel",
                DeployModel.LOCAL.name
            )
        )

    val workspaceId: String
        get() = env["connector.workspaceId"] ?: throw RuntimeException()

    val databaseURL: String?
        get() = env["connector.cluster.db_url"]

    val databaseUser: String
        get() = env.getOrDefault("connector.cluster.db_user", "")

    val databasePassword: String
        get() = env.getOrDefault("connector.cluster.db_pwd", "")

    val globalConfigDir: Path
        get() = Path(appConfig.getString("configDirPath"))

    val profilePath: Path
        get() = globalConfigDir.resolve(appConfig.getString("profile.path"))

    val integrationPath: Path
        get() = globalConfigDir.resolve(appConfig.getString("integration.path"))

    val dbtGlobalRepoDir: Path
        get() = globalConfigDir.resolve(appConfig.getString("dbt.repoFolderPath"))

    val dbtKeyConfigDir: Path
        get() = globalConfigDir.resolve(appConfig.getString("dbt.keyFolderPath"))

    enum class DeployModel(val profileManagerName: String) {
        LOCAL("file"),
        CLUSTER("database")
    }
}

class MissRequiredConfigException(configName: String) :
    CustomizedException("$configName is a required config field, you must set it to start the server.")
