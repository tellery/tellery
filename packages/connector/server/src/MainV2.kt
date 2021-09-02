package io.tellery

import io.tellery.entities.ProjectConfig
import io.tellery.managers.ConnectorManagerV2
import io.tellery.managers.DbtManagerV2
import io.tellery.managers.IntegrationManager
import io.tellery.managers.ProfileManager
import io.tellery.managers.impl.DatabaseProfileManager
import io.tellery.managers.impl.FileProfileManager
import io.tellery.services.ConnectorV2Service
import io.tellery.services.DbtV2Service
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
        single { ConnectorManagerV2(get()) }
        single { DbtManagerV2(get()) }

        // Service
        single { ProfileService(get(), get(), get(), get()) }
        single { DbtV2Service(get()) }
        single { ConnectorV2Service(get()) }
        single { RpcService(get(), get()) }
    }
}

fun providesProfileManager(): ProfileManager? {
    return when (ProjectConfig.deployModel) {
        ProjectConfig.DeployModel.LOCAL -> FileProfileManager()
        ProjectConfig.DeployModel.CLUSTER -> DatabaseProfileManager()
        else -> null
    }
}

@OptIn(KoinApiExtension::class)
class App : KoinComponent {
    val server: RpcService by inject()
    val dbtManager: DbtManagerV2 by inject()
    val connectorManager: ConnectorManagerV2 by inject()
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