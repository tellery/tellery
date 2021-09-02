package io.tellery

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
import org.koin.core.module.Module
import org.koin.core.qualifier.named
import org.koin.dsl.module
import entities.ProjectConfig as config

object Modules {

    fun providesAppModule(): Module {
        return module {
            // Manager
            single<ProfileManager>(named("file")) { FileProfileManager() }
            single<ProfileManager>(named("database")) { DatabaseProfileManager() }
            single { IntegrationManager() }
            single {
                ConnectorManagerV2(
                    get(qualifier = named(config.deployModel.profileManagerName))
                )
            }
            single {
                DbtManagerV2(
                    get(qualifier = named(config.deployModel.profileManagerName))
                )
            }

            // Service
            single {
                ProfileService(
                    get(),
                    get(qualifier = named(config.deployModel.profileManagerName)),
                    get(),
                    get()
                )
            }
            single { DbtV2Service(get()) }
            single { ConnectorV2Service(get()) }
            single { RpcService(get(), get()) }
        }
    }
}
