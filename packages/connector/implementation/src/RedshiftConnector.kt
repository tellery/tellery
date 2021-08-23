package io.tellery.connectors

import io.tellery.annotations.Config
import io.tellery.annotations.Config.ConfigType
import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.fields.RedshiftFields
import io.tellery.entities.ImportFailureException
import io.tellery.entities.Profile
import io.tellery.entities.TypeField
import io.tellery.utils.S3Storage
import io.tellery.utils.readCSV
import io.tellery.utils.toSQLType
import java.sql.Connection


@Connector(
    type = "Redshift",
    configs = [
        Config(
            name = RedshiftFields.ENDPOINT,
            type = ConfigType.STRING,
            description = "The endpoint of the Amazon Redshift cluster",
            hint = "examplecluster.abc123xyz789.us-west-2.redshift.amazonaws.com",
            required = true
        ),
        Config(
            name = RedshiftFields.PORT,
            type = ConfigType.NUMBER,
            description = "The port number that you specified when you launched the cluster. If you have a firewall, make sure that this port is open for you to use",
            hint = "5439",
            required = true
        ),
        Config(
            name = RedshiftFields.DATABASE,
            type = ConfigType.STRING,
            description = "The logical database to connect to and run queries against",
            hint = "my_db",
            required = true
        ),
        Config(
            name = RedshiftFields.SCHEMA,
            type = ConfigType.STRING,
            description = "The schema that tellery will connect to in the database (only used for dbt connection)",
            hint = "public",
            fillHint = true,
        ),
        Config(
            name = RedshiftFields.USERNAME,
            type = ConfigType.STRING,
            description = "The username (role) you used to connect to your Redshift cluster (created when initializing Redshift cluster)",
            hint = "your_username",
            required = true,
        ),
        Config(
            name = RedshiftFields.PASSWORD,
            type = ConfigType.STRING,
            description = "",
            hint = "",
            required = true,
            secret = true,
        ),
        Config(
            name = RedshiftFields.S3_ACCESS_KEY,
            type = ConfigType.STRING,
            description = "S3 Access Key ID(for uploading csv)"
        ),
        Config(
            name = RedshiftFields.S3_SECRET_KEY,
            type = ConfigType.STRING,
            description = "S3 Secret Access Key (for uploading csv)",
            secret = true
        ),
        Config(
            name = RedshiftFields.S3_REGION,
            type = ConfigType.STRING,
            description = "S3 region (be the same as your Redshift cluster)",
            hint = "us-east-1"
        ),
        Config(
            name = RedshiftFields.S3_BUCKET,
            type = ConfigType.STRING,
            description = "S3 bucket (where uploaded csv stores)",
            hint = "tellery"
        ),
        Config(
            name = RedshiftFields.S3_KEY_PREFIX,
            type = ConfigType.STRING,
            description = "S3 key prefix prepends to uploaded csv"
        ),
    ]
)
class RedshiftConnector : JDBCConnector() {
    override val driverClassName = "com.amazon.redshift.jdbc42.Driver"
    override val transactionIsolationLevel = Connection.TRANSACTION_READ_COMMITTED
    override val skippedSchema = setOf(
        "INFORMATION_SCHEMA",
        "PG_CATALOG",
        "PG_TOAST",
    )

    private var s3Client: S3Storage? = null

    override fun buildConnectionStr(profile: Profile): String {
        val endpoint = profile.configs[RedshiftFields.ENDPOINT]
        val port = profile.configs[RedshiftFields.PORT]
        val database = profile.configs[RedshiftFields.DATABASE]
        return "jdbc:redshift://${endpoint}:${port}/${database}"
    }

    override fun initByProfile(profile: Profile) {
        super.initByProfile(profile)
        s3Client = S3Storage.buildFromConfigs(profile.configs)
        s3Client?.run {
            logger.info("{} has initialized s3 client", profile.name)
        }
    }

    private suspend fun createTable(
        connection: Connection, database: String, tableName: String,
        fields: List<TypeField>,
    ) {
        connection.createStatement().use { stmt ->
            // add correct indentation in case of printing sql statement for debugging / logging
            val injection = fields.joinToString(",\n    ") {
                    (
                        name,
                        type,
                    ),
                ->
                "${name.uppercase()} ${toSQLType(type)}"
            }

            val createTableSQL = """
                |CREATE TABLE $tableName
                |(
                |    $injection
                |)
                |""".trimMargin()

            stmt.execute(createTableSQL)

            logger.info("created table @ {}:{}", database, tableName)
        }
    }

    private suspend fun copyFromS3(
        connection: Connection,
        _database: String,
        tableName: String,
        s3Path: String
    ) {
        connection.createStatement().use { stmt ->
            val copyFromSQL = """
                |COPY $tableName
                |FROM '$s3Path'
                |credentials 'aws_access_key_id=${this.s3Client!!.accessKey};aws_secret_access_key=${this.s3Client!!.secretKey}'
                |REGION '${this.s3Client!!.region}'
                |IGNOREHEADER 1
                |CSV
            """.trimMargin()
            stmt.execute(copyFromSQL)
        }
    }

    override fun importSanityCheck(database: String, collection: String, schema: String?) {
        super.importSanityCheck(database, collection, schema)
        if (this.s3Client == null) {
            throw ImportFailureException("Redshift Connector must be initialized with s3 config to support importing")
        }
    }

    @HandleImport("text/csv")
    suspend fun importFromCSV(
        database: String,
        collection: String,
        schema: String?,
        content: ByteArray
    ) {
        val csvData = readCSV(content)
        val filename = "$database/${if (schema != null) "$schema." else ""}$collection.csv"
        val s3Path = this.s3Client!!.uploadFile(filename, content, "text/csv")
        dbConnection.apply {
            transactionIsolation = transactionIsolationLevel
        }.use { connection ->
            val tableName = if (schema != null) "$schema.$collection" else collection
            try {
                connection.autoCommit = false
                createTable(connection, database, tableName, csvData.fields)
                copyFromS3(connection, database, tableName, s3Path)
                connection.commit()
            } catch (error: Exception) {
                connection.rollback()
                throw error
            }
        }
    }
}