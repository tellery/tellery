package io.tellery

import entities.ProjectConfig
import io.tellery.managers.ConnectorManagerV2
import io.tellery.managers.ProfileManager
import io.tellery.managers.impl.DatabaseProfileManager
import io.tellery.managers.impl.FileProfileManager
import io.tellery.services.ProfileService
import org.koin.core.module.Module
import org.koin.dsl.module
import org.ktorm.database.Database

object Modules {

    fun providesAppModule(): Module {
        return module {
            single { ProjectConfig() }
            single { providesDatabaseClient(get()) }
            single { providesProfileManager(get(), get()) }
            single { ConnectorManagerV2(get(), get()) }

            // Service
            single { ProfileService(get(), get()) }
        }
    }

    private fun providesProfileManager(
        config: ProjectConfig,
        database: Database
    ): ProfileManager = when (config.deployModel) {
        ProjectConfig.DeployModel.LOCAL -> FileProfileManager(config)
        ProjectConfig.DeployModel.CLUSTER -> DatabaseProfileManager(database)
        else -> throw RuntimeException()
    }

    private fun providesDatabaseClient(config: ProjectConfig): Database? =
        when (config.deployModel) {
            ProjectConfig.DeployModel.LOCAL -> null
            ProjectConfig.DeployModel.CLUSTER -> Database.connect(
                url = config.databaseURL ?: throw RuntimeException(),
                driver = "org.postgresql.Driver",
                user = config.databaseUser,
                password = config.databasePassword
            )
            else -> throw RuntimeException()
        }
}
