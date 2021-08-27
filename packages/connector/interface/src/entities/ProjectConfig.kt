package entities

import com.typesafe.config.ConfigFactory
import java.nio.file.Path
import kotlin.io.path.Path

class ProjectConfig {

    private val appConfig = ConfigFactory.load()
    private val env = System.getenv()

    fun getDeployModel(): DeployModel {
        return DeployModel.valueOf(
            env.getOrDefault(
                "connector.deployModel",
                DeployModel.LOCAL.name
            )
        )
    }

    fun getWorkspaceId(): String {
        return env["connector.workspaceId"] ?: throw RuntimeException()
    }

    fun getDatabaseUrl(): String? {
        return env["connector.cluster.db_url"]
    }

    fun getDatabaseUser(): String {
        return env.getOrDefault("connector.cluster.db_user", "")
    }

    fun getDatabasePassword(): String {
        return env.getOrDefault("connector.cluster.db_pwd", "")
    }

    fun getGlobalConfigDir(): Path {
        return Path(appConfig.getString("configDirPath"))
    }

    fun getProfilePath(): Path {
        return getGlobalConfigDir().resolve(appConfig.getString("profile.path"))
    }

    fun getIntegrationPath(): Path {
        return getGlobalConfigDir().resolve(appConfig.getString("integration.path"))
    }

    enum class DeployModel {
        LOCAL, CLUSTER
    }
}
