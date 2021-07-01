package io.tellery.connectors

import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.annotations.OptionalField
import io.tellery.annotations.Optionals
import io.tellery.entities.ImportFailureException
import io.tellery.entities.Profile
import io.tellery.entities.TypeField
import io.tellery.utils.S3Storage
import io.tellery.utils.readCSV
import io.tellery.utils.toSQLType
import java.sql.Connection


@Connector("jdbc:redshift")
@Optionals([
    OptionalField("S3_ACCESS_KEY", isSecret = true),
    OptionalField("S3_SECRET_KEY", isSecret = true),
    OptionalField("S3_REGION", isSecret = false),
    OptionalField("S3_BUCKET", isSecret = false),
    OptionalField("S3_KEY_PREFIX", isSecret = false),
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