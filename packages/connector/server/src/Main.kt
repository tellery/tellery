package io.tellery

import io.tellery.entities.ProjectConfig
import io.tellery.managers.ConnectorManager
import io.tellery.managers.DbtManager
import io.tellery.managers.IntegrationManager
import io.tellery.managers.ProfileManager
import io.tellery.managers.impl.DatabaseProfileManager
import io.tellery.managers.impl.FileProfileManager
import io.tellery.services.ConnectorService
import io.tellery.services.DbtService
import io.tellery.services.ProfileService
import io.tellery.services.RpcService
import org.koin.core.component.KoinApiExtension
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import org.koin.core.context.startKoin
import org.koin.core.logger.Level
import org.koin.core.module.Module
import org.koin.dsl.module

fun providesAppModule(): Module {
    return module {
        // Manager
        single { providesProfileManager() }
        single { IntegrationManager() }
        single { ConnectorManager(get()) }
        single { DbtManager(get()) }

        // Service
        single { ProfileService(get(), get(), get(), get()) }
        single { DbtService(get()) }
        single { ConnectorService(get()) }
        single { RpcService(get(), get(), get()) }
    }
}

fun providesProfileManager(): ProfileManager? =
    when (ProjectConfig.deployModel) {
        ProjectConfig.DeployModel.LOCAL -> FileProfileManager()
        ProjectConfig.DeployModel.CLUSTER -> DatabaseProfileManager()
        else -> null
    }

@OptIn(KoinApiExtension::class)
class App : KoinComponent {
    val server: RpcService by inject()
    val dbtManager: DbtManager by inject()
    val connectorManager: ConnectorManager by inject()
}

fun main() {
    startKoin {
        printLogger(Level.ERROR)
        modules(providesAppModule())
    }

    val app = App()
    app.server.start()
    app.connectorManager.reloadConnector()
    app.dbtManager.reloadContext()
    app.server.blockUntilShutdown()
}