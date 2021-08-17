package io.tellery.connectors

import io.tellery.annotations.Config
import io.tellery.annotations.Config.ConfigType
import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.fields.SnowflakeFields
import io.tellery.entities.CollectionField
import io.tellery.entities.Profile
import io.tellery.entities.TypeField
import io.tellery.utils.buildOptionalsFromConfigs
import io.tellery.utils.readCSV
import io.tellery.utils.toSQLType
import net.snowflake.client.jdbc.SnowflakeConnection
import java.sql.Connection


@Connector(
    type = "Snowflake",
    configs = [
        Config(
            name = SnowflakeFields.ACCOUNT_NAME,
            type = ConfigType.STRING,
            description = "Your Snowflake account name",
            hint = "xy12345",
            required = true
        ),
        Config(
            name = SnowflakeFields.REGION_ID,
            type = ConfigType.STRING,
            description = "Your region Id",
            hint = "us-ease-2.aws",
            required = true
        ),
        Config(
            name = SnowflakeFields.USERNAME,
            type = ConfigType.STRING,
            description = "Your Snowflake username",
            hint = "your_username",
            required = true,
        ),
        Config(
            name = SnowflakeFields.PASSWORD,
            type = ConfigType.STRING,
            description = "Your Snowflake password",
            hint = "",
            required = true,
            secret = true,
        ),
        Config(
            name = SnowflakeFields.ROLE,
            type = ConfigType.STRING,
            description = "The default access control role to use in the Snowflake session",
            hint = "SYSADMIN"
        ),
        Config(
            name = SnowflakeFields.WAREHOUSE,
            type = ConfigType.STRING,
            description = "The virtual warehouse to use once connected by default",
            hint = "COMPUTE_WH",
            fillHint = true,
        ),
        Config(
            name = SnowflakeFields.DATABASE,
            type = ConfigType.STRING,
            description = "The database that tellery will connect to",
            hint = "SNOWFLAKE_SAMPLE_DATA",
            required = true,
        ),
        Config(
            name = SnowflakeFields.SCHEMA,
            type = ConfigType.STRING,
            description = "The schema that tellery will connect to in the database",
            hint = "PUBLIC",
            fillHint = true
        )
    ]
)
class SnowflakeConnector : JDBCConnector() {

    override val driverClassName = "net.snowflake.client.jdbc.SnowflakeDriver"
    override val transactionIsolationLevel = Connection.TRANSACTION_READ_COMMITTED
    override val defaultSchema = null

    override fun buildConnectionStr(profile: Profile): String {
        val accountName = profile.configs[SnowflakeFields.ACCOUNT_NAME]
        val regionId = profile.configs[SnowflakeFields.REGION_ID]
        val role = profile.configs[SnowflakeFields.ROLE]
        val warehouse = profile.configs[SnowflakeFields.WAREHOUSE]
        val database = profile.configs[SnowflakeFields.DATABASE]
        val schema = profile.configs[SnowflakeFields.SCHEMA]
        return "jdbc:snowflake://${accountName}.${regionId}.snowflakecomputing.com/${
            buildOptionalsFromConfigs(
                mapOf(
                    "role" to role,
                    "db" to database,
                    "schema" to schema,
                    "warehouse" to warehouse
                )
            )
        }"
    }

    override fun isDefaultSchema(field: CollectionField): Boolean {
        return field.schema?.let {
            it == field.collection
        } ?: false
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
                |CREATE TABLE $database.$tableName
                |(
                |    $injection
                |)
                |""".trimMargin()

            stmt.execute(createTableSQL)

            logger.info("created table @ {}:{}", database, tableName)
        }
    }

    private suspend fun uploadToStage(
        connection: Connection,
        database: String,
        schema: String,
        collection: String,
        tableName: String,
        content: ByteArray,
    ) {
        connection.unwrap(SnowflakeConnection::class.java).uploadStream(
            "@$database.$schema.%$collection",
            database,
            content.inputStream(),
            "$tableName.csv",
            true
        )
    }

    private suspend fun copyFromStageIntoTable(
        connection: Connection,
        database: String,
        tableName: String
    ) {
        connection.createStatement().use { stmt ->
            val copyFromSQL = """
                |COPY INTO $database.$tableName FILE_FORMAT = (
                |  TYPE = CSV
                |  SKIP_HEADER = 1
                |);
            """.trimMargin()
            stmt.execute(copyFromSQL)
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
        dbConnection.apply {
            transactionIsolation = transactionIsolationLevel
        }.use { connection ->
            val tableName = if (schema != null) "$schema.$collection" else collection
            try {
                connection.autoCommit = false
                createTable(connection, database, tableName, csvData.fields)
                uploadToStage(
                    connection,
                    database,
                    schema ?: "PUBLIC",
                    collection,
                    tableName,
                    content
                )
                copyFromStageIntoTable(connection, database, tableName)
                connection.commit()
            } catch (error: Exception) {
                connection.rollback()
                throw error
            }
        }
    }
}