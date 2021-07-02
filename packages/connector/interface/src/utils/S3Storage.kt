package io.tellery.utils

import com.amazonaws.auth.AWSStaticCredentialsProvider
import com.amazonaws.auth.BasicAWSCredentials
import com.amazonaws.client.builder.AwsClientBuilder
import com.amazonaws.services.s3.AmazonS3
import com.amazonaws.services.s3.AmazonS3ClientBuilder
import com.amazonaws.services.s3.model.ObjectMetadata
import com.amazonaws.services.s3.transfer.Transfer
import com.amazonaws.services.s3.transfer.TransferManager
import com.amazonaws.services.s3.transfer.TransferManagerBuilder
import com.amazonaws.services.s3.transfer.Upload
import com.amazonaws.services.s3.transfer.model.UploadResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import mu.KotlinLogging
import kotlin.coroutines.resumeWithException


val logger = KotlinLogging.logger { }

class S3Storage(
    val accessKey: String,
    val secretKey: String,
    val region: String,
    val bucket: String,
    val endpoint: String? = null,
    private val keyPrefix: String? = null,
) {

    private val client: AmazonS3
    private val transferManager: TransferManager

    companion object {
        fun buildByOptionals(optionals: Map<String, String>?): S3Storage? {
            var s3Client: S3Storage? = null
            val accessKey = optionals?.get("S3_ACCESS_KEY")
            val secretKey = optionals?.get("S3_SECRET_KEY")
            val region = optionals?.get("S3_REGION")
            val bucket = optionals?.get("S3_BUCKET")
            val endpoint = optionals?.get("S3_ENDPOINT")
            val keyPrefix = optionals?.get("S3_KEY_PREFIX")
            if (accessKey != null && secretKey != null && region != null && bucket != null) {
                s3Client = S3Storage(accessKey, secretKey, region, bucket, endpoint, keyPrefix)
            }
            return s3Client
        }
    }

    init {
        val credentials = BasicAWSCredentials(accessKey, secretKey)
        var clientBuilder = AmazonS3ClientBuilder
            .standard()
            .withCredentials(AWSStaticCredentialsProvider(credentials))
        if (endpoint != null) {
            clientBuilder =
                clientBuilder.withEndpointConfiguration(AwsClientBuilder.EndpointConfiguration(endpoint, region))
        }
        this.client = clientBuilder.build()
        this.transferManager = TransferManagerBuilder.standard().apply {
            s3Client = client
        }.build()
    }

    private suspend fun uploadFile(bucket: String, key: String, content: ByteArray, fileType: String): String {
        val uploadResult = withContext(Dispatchers.IO) {
            val uploadHandler = transferManager.upload(bucket, key, content.inputStream(), ObjectMetadata().apply {
                contentLength = content.size.toLong()
                contentType = fileType
            })
            uploadHandler.waitForUploadResult()
        }
        return "s3://${uploadResult.bucketName}/$key"
    }

    suspend fun uploadFile(
        filename: String,
        content: ByteArray,
        fileType: String,
    ): String {
        val key = "${if ((keyPrefix ?: "").isNotBlank()) "${keyPrefix!!.trimEnd('/')}/" else ""}$filename"
        return uploadFile(bucket, key, content, fileType)
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
suspend fun Upload.await(): UploadResult = suspendCancellableCoroutine { cont ->
    addProgressListener {
        logger.info("start Current upload: {}%:{}", progress.percentTransferred, state)
        if (state == Transfer.TransferState.Completed) {
            logger.info { "completed" }
            try {
                cont.resume(waitForUploadResult()){}
            } catch (e: Throwable) {
                cont.resumeWithException(e)
            }
        }
        logger.info("end Current upload: {}%:{}", progress.percentTransferred, state)
    }
}
