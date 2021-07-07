package io.tellery.connectors

import io.tellery.annotations.Config
import io.tellery.annotations.Config.ConfigType
import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
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
    jdbcConfigs = [
        Config(name="accountName", type=ConfigType.STRING, description = "your Snowflake account name",hint="xy12345", required=true),
        Config(name="regionId", type=ConfigType.STRING, description="Your region Id", hint="us-ease-2.aws", required=true),
        Config(name="role", type=ConfigType.STRING, description="the default access control role to use in the Snowflake session", hint="SYSADMIN"),
        Config(name="warehouse", type=ConfigType.STRING, description="the virtual warehouse to use once connected by default", hint="COMPUTE_WH")
])
class SnowflakeConnector : JDBCConnector() {

    override val driverClassName = "net.snowflake.client.jdbc.SnowflakeDriver"
    override val transactionIsolationLevel = Connection.TRANSACTION_READ_COMMITTED
    override val defaultSchema = null

    override fun buildConnectionStr(profile: Profile): String {
        val accountName = profile.configs["accountName"]
        val regionId = profile.configs["regionId"]
        return "jdbc:snowflake://${accountName}.${regionId}.snowflakecomputing.com/${buildOptionalsFromConfigs(profile.configs.filterKeys { it in setOf("role", "warehouse") })}"
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
                "${name.toUpperCase()} ${toSQLType(type)}"
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

    private suspend fun copyFromStageIntoTable(connection: Connection, database: String, tableName: String) {
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
    suspend fun importFromCSV(database: String, collection: String, schema: String?, content: ByteArray) {
        val csvData = readCSV(content)
        dbConnection.apply {
            transactionIsolation = transactionIsolationLevel
        }.use { connection ->
            val tableName = if (schema != null) "$schema.$collection" else collection
            try {
                connection.autoCommit = false
                createTable(connection, database, tableName, csvData.fields)
                uploadToStage(connection, database, schema ?: "PUBLIC", collection, tableName, content)
                copyFromStageIntoTable(connection, database, tableName)
                connection.commit()
            } catch (error: Exception) {
                connection.rollback()
                throw error
            }
        }
    }


}