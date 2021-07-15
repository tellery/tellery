package io.tellery.connectors

import arrow.core.Either
import com.aventrix.jnanoid.jnanoid.NanoIdUtils
import com.google.auth.oauth2.ServiceAccountCredentials
import com.google.cloud.bigquery.*
import com.google.cloud.bigquery.BigQuery.DatasetListOption
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import io.tellery.annotations.Config
import io.tellery.annotations.Config.ConfigType
import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.entities.*
import io.tellery.utils.loadPrivateKey
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.suspendCancellableCoroutine
import java.nio.channels.Channels
import java.sql.Types
import java.util.concurrent.CompletableFuture
import java.util.concurrent.Executors
import kotlin.coroutines.resumeWithException


@Connector(
    type = "BigQuery",
    configs = [
        Config(
            name = "Key File",
            type = ConfigType.STRING,
            description = "Upload your key file right here. For instruction see here: https://cloud.google.com/bigquery/docs/quickstarts/quickstart-client-libraries",
            hint = "",
            required = true
        )
    ]
)
class BigQueryConnector : BaseConnector() {

    private val gson = Gson()

    private lateinit var bigQueryOpts: BigQueryOptions

    private lateinit var bigQueryClient: BigQuery

    private val executor = Executors.newFixedThreadPool(10)

    override fun initByProfile(profile: Profile) {
        val keyfileBody = gson.fromJson(profile.configs["Key File"], BigQueryKeyBody::class.java)
        bigQueryOpts = BigQueryOptions.newBuilder().setCredentials(keyfileBody.toCreds()).build()
        bigQueryClient = bigQueryOpts.service
    }

    override suspend fun getDatabases(): List<String> {
        return bigQueryClient.listDatasets(DatasetListOption.all()).iterateAll().map{ it.datasetId.dataset }
    }


    // Here dbName stands for datasetId
    override suspend fun getCollections(dbName: String): List<CollectionField> {
        return bigQueryClient.listTables(dbName).iterateAll().map{ CollectionField(it.tableId.table, null) }
    }

    // Here dbName stands for datasetId, and collectionName stands for tableId
    override suspend fun getCollectionSchema(
        dbName: String,
        collectionName: String,
        schemaName: String?
    ): List<TypeField> {
        val table = bigQueryClient.getTable(dbName, collectionName)
        return table.getDefinition<StandardTableDefinition>().schema?.fields?.map {
            TypeField(it.name, bigQueryTypeToSQLType(it.type.standardType))
        } ?: emptyList()
    }

    override suspend fun query(
        ctx: QueryContext,
        sendToChannel: suspend (QueryResultWrapper) -> Unit
    ) {
        val queryConfig = QueryJobConfiguration.newBuilder(ctx.sql).build()
        val jobId = JobId.newBuilder().setJob("${ctx.questionId}-${NanoIdUtils.randomNanoId()}").build()

        val resultSet = asyncJobRunner(jobId) {
            bigQueryClient.query(queryConfig, jobId)
        }

        val fields = resultSet.schema.fields.map{
            TypeField(it.name, bigQueryTypeToSQLType(it.type.standardType))
        }
        sendToChannel(Either.Left(fields))

        resultSet.iterateAll().forEach { row ->
            sendToChannel(Either.Right(row.map{it.value}))
        }
    }

    @HandleImport("text/csv")
    suspend fun importFromCSV(
        database: String,
        collection: String,
        _schema: String?,
        content: ByteArray
    ){

        val writeChannelConfig = WriteChannelConfiguration
            .newBuilder(TableId.of(database, collection))
            .setFormatOptions(FormatOptions.csv())
            .setAutodetect(true)
            .build()

        val jobId = JobId.newBuilder().setJob("importCSV_${NanoIdUtils.randomNanoId()}").build()

        asyncJobRunner(jobId) {
            bigQueryClient.writer(jobId, writeChannelConfig).use {
                val stream = Channels.newOutputStream(it)
                stream.write(content)
            }
            val job = bigQueryClient.getJob(jobId)
            val completed = job.waitFor()
            if (completed == null) {
                throw InterruptedException()
            } else {
                if (completed.status.error != null){
                    logger.error("import failed: {}", completed.status.error)
                    throw Exception("BigQuery import error: ${completed.status.error.toString()}")
                }
            }
        }
    }

    private suspend fun <T> asyncJobRunner(jobId: JobId, job: () -> T): T {
        return suspendCancellableCoroutine { cont ->
            try {
                val completableFuture = CompletableFuture.supplyAsync(job, executor)

                cont.invokeOnCancellation {
                    bigQueryClient.cancel(jobId)
                    completableFuture.cancel(true)
                }

                completableFuture.handle{res, exception ->
                    if (exception != null){
                        cont.resumeWithException(exception)
                    } else {
                        cont.resumeWith(Result.success(res))
                    }
                }
            } catch (e: InterruptedException){
                throw CancellationException()
            }
        }
    }

    private fun bigQueryTypeToSQLType(type: StandardSQLTypeName): Int {
        return when(type){
            StandardSQLTypeName.BOOL -> Types.BOOLEAN
            StandardSQLTypeName.INT64 -> Types.INTEGER
            StandardSQLTypeName.FLOAT64 -> Types.DOUBLE
            StandardSQLTypeName.NUMERIC -> Types.NUMERIC
            StandardSQLTypeName.BIGNUMERIC -> Types.NUMERIC
            StandardSQLTypeName.STRING -> Types.VARCHAR
            StandardSQLTypeName.BYTES -> Types.VARBINARY
            StandardSQLTypeName.STRUCT -> Types.STRUCT
            StandardSQLTypeName.ARRAY -> Types.ARRAY
            StandardSQLTypeName.TIMESTAMP -> Types.TIMESTAMP
            StandardSQLTypeName.DATE -> Types.DATE
            StandardSQLTypeName.TIME -> Types.TIME
            StandardSQLTypeName.DATETIME -> Types.TIMESTAMP
            StandardSQLTypeName.GEOGRAPHY -> Types.OTHER
        }
    }

    data class BigQueryKeyBody(
        @SerializedName("type") val type: String,
        @SerializedName("project_id") val projectId: String,
        @SerializedName("private_key_id") val privateKeyId: String,
        @SerializedName("private_key") val privateKey: String,
        @SerializedName("client_email") val clientEmail: String,
        @SerializedName("client_id") val clientId: String,
        @SerializedName("auth_uri") val authUri: String,
        @SerializedName("token_uri") val tokenUri: String,
        @SerializedName("auth_provider_x509_cert_url") val authProviderX509CertUrl: String,
        @SerializedName("client_x509_cert_url") val clientX509CertUrl: String
    ) {
        fun toCreds(): ServiceAccountCredentials {
            val obj = this
            return ServiceAccountCredentials.newBuilder().apply{
                projectId = obj.projectId
                privateKeyId = obj.privateKeyId
                privateKey = loadPrivateKey(obj.privateKey)
                clientId = obj.clientId
                clientEmail = obj.clientEmail
            }.build()
        }
    }
}