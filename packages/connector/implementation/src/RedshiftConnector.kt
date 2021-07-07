package io.tellery.connectors

import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.annotations.Config
import io.tellery.annotations.Config.ConfigType
import io.tellery.entities.ImportFailureException
import io.tellery.entities.Profile
import io.tellery.entities.TypeField
import io.tellery.utils.S3Storage
import io.tellery.utils.readCSV
import io.tellery.utils.toSQLType
import java.sql.Connection


@Connector(
    type="Redshift",
    jdbcConfigs = [
        Config(name="Endpoint", type= ConfigType.STRING, description="The endpoint of the Amazon Redshift cluster", hint="examplecluster.abc123xyz789.us-west-2.redshift.amazonaws.com",required=true),
        Config(name="Port", type= ConfigType.NUMBER, description="The port number that you specified when you launched the cluster. If you have a firewall, make sure that this port is open for you to use", hint="5439",required=true),
        Config(name="Database", type= ConfigType.STRING, description="The logical database to connect to and run queries against", hint="my_db",required=true),
    ],
    optionals = [
        Config(name="S3AccessKey", type=ConfigType.STRING, description="S3 Access Key ID(for uploading csv)"),
        Config(name="S3SecretKey", type=ConfigType.STRING, description="S3 Secret Access Key (for uploading csv)", secret=true),
        Config(name="S3Region", type=ConfigType.STRING, description="S3 region (be the same as your Redshift cluster", hint="us-east-1"),
        Config(name="S3Bucket", type=ConfigType.STRING, description="S3 bucket (where uploaded csv stores)", hint="tellery"),
        Config(name="S3KeyPrefix", type=ConfigType.STRING, description="S3 key prefix prepends to uploaded csv"),
])
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
        val endpoint = profile.configs["Endpoint"]
        val port = profile.configs["Port"]
        val database = profile.configs["Database"]
        return "jdbc:redshift://${endpoint}:${port}/${database}"
    }

    override fun initByProfile(profile: Profile) {
        super.initByProfile(profile)
        s3Client = S3Storage.buildByOptionals(profile.optionals)
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
                "${name.toUpperCase()} ${toSQLType(type)}"
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

    private suspend fun copyFromS3(connection: Connection, _database: String, tableName: String, s3Path: String) {
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
    suspend fun importFromCSV(database: String, collection: String, schema: String?, content: ByteArray) {
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