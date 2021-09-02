package io.tellery.services

import io.grpc.Server
import io.grpc.ServerBuilder
import io.grpc.util.TransmitStatusRuntimeExceptionInterceptor
import mu.KotlinLogging
import io.tellery.entities.ProjectConfig as config

class RpcService(
    dbtService: DbtV2Service,
    profileService: ProfileService
) {
    private var server: Server

    companion object {
        val logger = KotlinLogging.logger { }
    }

    init {
        val partialBuilder = ServerBuilder.forPort(config.port)

        // TODO: about credential

        server = partialBuilder
            .addService(dbtService)
            .addService(profileService)
            .intercept(TransmitStatusRuntimeExceptionInterceptor.instance())
            .build()
    }

    fun start() {
        server.start()
        logger.info("Server started, listening on {}", config.port)
        Runtime.getRuntime().addShutdownHook(
            Thread {
                logger.info("*** shutting down gRPC server since JVM is shutting down")
                this@RpcService.stop()
                logger.info("*** server shut down")
            }
        )
    }

    fun blockUntilShutdown() {
        server.awaitTermination()
    }

    private fun stop() {
        server.shutdown()
    }
}