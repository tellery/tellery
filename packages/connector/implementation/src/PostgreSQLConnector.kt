package io.tellery.connectors

import io.tellery.annotations.Config
import io.tellery.annotations.Config.ConfigType
import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.connectors.fields.PostgreSQLFields
import io.tellery.entities.Profile
import io.tellery.entities.TypeField
import io.tellery.utils.readCSV
import io.tellery.utils.setByType
import io.tellery.utils.toSQLType
import java.sql.Connection


@Connector(
    type = "PostgreSQL",
    configs = [
        Config(
            name = PostgreSQLFields.ENDPOINT,
            type = ConfigType.STRING,
            description = "The endpoint of your postgreSQL",
            hint = "your-db-hostname-or-ip",
            required = true
        ),
        Config(
            name = PostgreSQLFields.PORT,
            type = ConfigType.NUMBER,
            description = "The port number of your database. If you have a firewall, make sure that this port is open for you to use",
            hint = "5432",
            required = true
        ),
        Config(
            name = PostgreSQLFields.DATABASE,
            type = ConfigType.STRING,
            description = "The logical database to connect to and run queries against",
            hint = "my_db",
            required = true
        ),
        Config(
            name = PostgreSQLFields.SCHEMA,
            type = ConfigType.STRING,
            description = "The schema that tellery will connect to in the database",
            hint = "PUBLIC"
        ),
        Config(
            name = PostgreSQLFields.USERNAME,
            type = ConfigType.STRING,
            description = "The username (role) you used to connect to your database",
            hint = "postgres",
            required = true,
        ),
        Config(
            name = PostgreSQLFields.PASSWORD,
            type = ConfigType.STRING,
            description = "",
            hint = "",
            required = true,
            secret = true,
        )
    ]
)
class PostgreSQLConnector : JDBCConnector() {

    override val driverClassName = "org.postgresql.Driver"
    override val transactionIsolationLevel = Connection.TRANSACTION_READ_COMMITTED
    override val skippedSchema = setOf(
        "INFORMATION_SCHEMA",
        "PG_CATALOG",
        "PG_TOAST",
    )

    override fun buildConnectionStr(profile: Profile): String {
        val endpoint = profile.configs["Endpoint"]
        val port = profile.configs["Port"]
        val database = profile.configs["Database"]
        return "jdbc:postgresql://${endpoint}:${port}/${database}"
    }


    private suspend fun createTable(
        connection: Connection, database: String, collection: String, schema: String?,
        fields: List<TypeField>,
    ) {
        connection.createStatement().use { stmt ->
            // add correct indentation in case of printing sql statement for debugging / logging
            val injection = fields.joinToString("\n    ") {
                    (
                        name,
                        type,
                    ),
                ->
                "${name.uppercase()} ${toSQLType(type)},"
            }
            val tableName = if (schema != null) "$schema.$collection" else collection

            val createTableSQL = """
                |CREATE TABLE $tableName
                |(
                |    ID serial,
                |    $injection
                |    PRIMARY KEY (ID)
                |)
                |""".trimMargin()

            stmt.execute(createTableSQL)

            logger.info("created table @ {}:{}:{}", database, collection, schema)
        }
    }

    suspend fun write(
        connection: Connection,
        _database: String,
        collection: String,
        schema: String?,
        fields: List<TypeField>,
        rows: List<List<Any>>,
    ) {
        val tableName = if (schema != null) "$schema.$collection" else collection
        val rowNames = fields.joinToString(", ") { it.name }
        val valueEntry = "?".repeat(fields.size).toCharArray().joinToString(", ")
        val sql = "INSERT INTO $tableName ($rowNames) VALUES ($valueEntry)"

        connection.prepareStatement(sql).use { stmt ->
            rows.forEach { row ->
                row.zip(fields).forEachIndexed { index, (value, field) ->
                    stmt.setByType(index + 1, field.type, value.toString())
                }
                stmt.addBatch()
                stmt.clearParameters()
            }
            stmt.executeBatch()
        }
    }

    private suspend fun createTableAndWrite(
        database: String,
        collection: String,
        schema: String?,
        fields: List<TypeField>,
        rows: List<List<Any>>,
    ) {
        dbConnection.apply {
            transactionIsolation = transactionIsolationLevel
        }.use { conn ->
            try {
                conn.autoCommit = false
                createTable(conn, database, collection, schema, fields)
                write(conn, database, collection, schema, fields, rows)
                conn.commit()
            } catch (e: Exception) {
                conn.rollback()
                throw e
            }
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
        createTableAndWrite(database, collection, schema, csvData.fields, csvData.records)
    }
}