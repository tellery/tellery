package io.tellery.services

import io.grpc.Server
import io.grpc.ServerBuilder
import io.grpc.protobuf.services.ProtoReflectionService
import io.grpc.util.TransmitStatusRuntimeExceptionInterceptor
import mu.KotlinLogging
import java.io.File
import io.tellery.entities.ProjectConfig as config

class RpcService(
    dbtService: DbtService,
    profileService: ProfileService,
    connectorService: ConnectorService
) {
    private var server: Server

    companion object {
        val logger = KotlinLogging.logger { }
    }

    init {
        var partialBuilder = ServerBuilder
            .forPort(config.port)

        if (config.credCertPath != null && config.credKeyPath != null) {
            try {
                logger.info("Starting server in secure mode.")
                partialBuilder = partialBuilder.useTransportSecurity(
                    File(config.credCertPath),
                    File(config.credKeyPath)
                )
            } catch (e: Exception) {
                logger.error(
                    "Error happens on loading credentials: {}, Starting server in insecure mode",
                    e.message
                )
                e.printStackTrace()
            }
        } else {
            logger.info("Credentials has not been setup, starting server in insecure mode")
        }

        server = partialBuilder
            .addService(dbtService)
            .addService(profileService)
            .addService(connectorService)
            .addService(ProtoReflectionService.newInstance())
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