package io.tellery

import io.tellery.managers.ConnectorManagerV2
import io.tellery.managers.DbtManagerV2
import io.tellery.services.RpcService
import org.koin.core.component.KoinApiExtension
import org.koin.core.component.KoinComponent
import org.koin.core.component.inject
import org.koin.core.context.startKoin
import org.koin.core.logger.Level

@OptIn(KoinApiExtension::class)
class App : KoinComponent {
    val server: RpcService by inject()
    val dbtManager: DbtManagerV2 by inject()
    val connectorManager: ConnectorManagerV2 by inject()
}

fun main() {
    startKoin {
        printLogger(Level.ERROR)
        modules(Modules.providesAppModule())
    }

    val app = App()
    app.server.start()
    app.connectorManager.reloadConnector()
    app.dbtManager.reloadContext()
    app.server.blockUntilShutdown()
}