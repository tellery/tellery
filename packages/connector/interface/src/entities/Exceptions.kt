package io.tellery.entities

import io.grpc.Status
import io.grpc.Metadata
import io.grpc.StatusRuntimeException


class TruncateException : Exception("Truncated")

class DBProfileNotConfiguredException :
    Exception("DB Profile not configured correctly! Please specify its path in application.conf")

class JDBCDriverClassNotFoundException(profile: String, className: String) :
    Exception("Driver not found for profile $profile, required driver $className")

class DBProfileNotValidException :
    Exception("DB Profile is corrupted! Please validate if it is malformed")

open class CustomizedException(
    override val message: String,
    status: Status = Status.INTERNAL,
) : StatusRuntimeException(status.withDescription(message), Metadata())

class InvalidParamException :
    CustomizedException("Invalid Param!")

class CollectionExistsException :
    CustomizedException("Bad Insertion: given collection name exists!")

class SchemaDoesNotExistException :
    CustomizedException("Bad Insertion: given collection schema does not exist!")

class ProfileNotFoundException(profile: String) :
    CustomizedException("Profile Not Found: $profile", Status.NOT_FOUND)


open class ImportFailureException(reason: String) :
    CustomizedException("Cannot import file into database, reason: $reason", Status.UNAVAILABLE)

class ImportNotSupportedException(contentType: String) :
    ImportFailureException("$contentType has not been supported!")

class DownloadFailedException :
    ImportFailureException("failed to download file")
