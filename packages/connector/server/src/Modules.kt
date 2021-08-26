package io.tellery

import entities.ProjectConfig
import io.tellery.managers.ConnectorManagerV2
import io.tellery.managers.ResourceManager
import io.tellery.managers.impl.FileResourceManager
import org.koin.core.module.Module
import org.koin.dsl.module

object Modules {

    fun providesAppModule(): Module {
        return module {
            single { ProjectConfig() }
            single { providesResourceManager(get()) }
            single { ConnectorManagerV2() }
        }
    }

    private fun providesResourceManager(config: ProjectConfig): ResourceManager {
        when (config.getDeployModel()) {
            ProjectConfig.DeployModel.LOCAL -> return FileResourceManager(config)
            else -> throw RuntimeException()
        }
    }
}