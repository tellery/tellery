package entities

import com.typesafe.config.ConfigFactory
import java.nio.file.Path
import kotlin.io.path.Path

class ProjectConfig {

    private val appConfig = ConfigFactory.load()

    fun getDeployModel(): String {
        return appConfig.getString("deployModel")
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
}
