package entities

import com.typesafe.config.ConfigFactory
import java.nio.file.Path
import kotlin.io.path.Path

class ProjectConfig {

    private val appConfig = ConfigFactory.load()
    private val env = System.getenv()

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
    
    enum class DeployModel {
        LOCAL, CLUSTER
    }
}
