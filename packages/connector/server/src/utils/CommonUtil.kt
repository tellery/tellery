package io.tellery.common

import io.grpc.Metadata
import io.grpc.Status
import io.grpc.StatusRuntimeException
import io.tellery.entities.CustomizedException
import mu.KotlinLogging
import java.sql.SQLException

private val logger = KotlinLogging.logger { }

suspend fun <T> withErrorWrapper(handler: suspend () -> T): T {
    try {
        return handler()
    } catch (e: Exception) {
        throw errorWrapper(e, handler.javaClass.enclosingMethod.name)
    }
}

fun errorWrapper(e: Exception, decoratedName: String): StatusRuntimeException {
    return when (e) {
        is StatusRuntimeException -> e
        is SQLException -> {
            StatusRuntimeException(
                Status.UNAVAILABLE.withCause(e).withDescription("SQL Error: ${e.message}"),
                Metadata()
            )
        }
        is AssertionError -> {
            StatusRuntimeException(
                Status.INVALID_ARGUMENT.withCause(e)
                    .withDescription("Client Argument Error: ${e.message}"),
                Metadata()
            )
        }
        else -> {
            logger.error("Error when handling $decoratedName", e)
            StatusRuntimeException(
                Status.INTERNAL.withCause(e).withDescription("Internal Error: ${e.message}"),
                Metadata()
            )
        }
    }
}

fun assertInternalError(value: Boolean, lazyMessage: () -> String) {
    if (!value) {
        val message = lazyMessage()
        throw CustomizedException(message)
    }
}
