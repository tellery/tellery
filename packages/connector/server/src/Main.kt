package io.tellery

import io.grpc.Server
import io.grpc.ServerBuilder
import io.grpc.protobuf.services.ProtoReflectionService
import io.grpc.util.TransmitStatusRuntimeExceptionInterceptor
import io.tellery.common.ConfigManager
import io.tellery.common.ConnectorManager
import io.tellery.common.dbt.DbtManager
import io.tellery.services.ConnectorService
import io.tellery.services.DbtService
import mu.KotlinLogging
import java.io.File


class ConnectorServer(
    val port: Int = 50051,
) {
    val logger = KotlinLogging.logger { }

    var server: Server

    init {
        var partialBuilder = ServerBuilder
            .forPort(port)
        if (ConfigManager.credential != null) {
            val credCertPath = ConfigManager.credential!!.certificate
            val credKeyPath = ConfigManager.credential!!.key
            try {
                logger.info("Starting server in secure mode")
                partialBuilder =
                    partialBuilder.useTransportSecurity(File(credCertPath), File(credKeyPath))
            } catch (e: Exception) {
                logger.info(
                    "Error happens on loading credentials: {}, Starting server in insecure mode",
                    e.message
                )
                e.printStackTrace()
            }
        } else {
            logger.info("Credentials has not been setup, starting server in insecure mode")
        }
        server = partialBuilder
            .addService(ConnectorService())
            .addService(DbtService())
            .addService(ProtoReflectionService.newInstance())
            .intercept(TransmitStatusRuntimeExceptionInterceptor.instance())
            .build()
    }

    fun start() {
        server.start()
        logger.info("Server started, listening on {}", port)
        Runtime.getRuntime().addShutdownHook(
            Thread {
                logger.info("*** shutting down gRPC server since JVM is shutting down")
                this@ConnectorServer.stop()
                logger.info("*** server shut down")
            }
        )
    }

    private fun stop() {
        server.shutdown()
        ConfigManager.close()
    }

    fun blockUntilShutdown() {
        server.awaitTermination()
    }
}

fun main() {
    ConnectorManager.init()
    DbtManager.initDbtWorkspace()
    val server = ConnectorServer(50051)
    server.start()
    server.blockUntilShutdown()
}

