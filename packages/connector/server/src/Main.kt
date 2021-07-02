package io.tellery

import io.grpc.*
import io.grpc.util.*
import io.tellery.common.*
import io.tellery.services.*
import mu.*
import java.io.*


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
                partialBuilder = partialBuilder.useTransportSecurity(File(credCertPath), File(credKeyPath))
            } catch (e: Exception) {
                logger.info("Error happens on loading credentials: {}, Starting server in insecure mode", e.message)
                e.printStackTrace()
            }
        } else {
            logger.info("Credentials has not been setup, starting server in insecure mode")
        }
        server = partialBuilder
            .addService(ConnectorService())
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
    val server = ConnectorServer(50051)
    server.start()
    server.blockUntilShutdown()
}

