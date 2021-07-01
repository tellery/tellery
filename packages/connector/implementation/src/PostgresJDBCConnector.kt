package io.tellery.connectors

import io.tellery.annotations.Connector
import io.tellery.annotations.HandleImport
import io.tellery.entities.TypeField
import io.tellery.utils.readCSV
import io.tellery.utils.setByType
import io.tellery.utils.toSQLType
import java.sql.Connection


@Connector("jdbc:postgres")
class PostgresJDBCConnector : JDBCConnector() {

    override val driverClassName = "org.postgresql.Driver"
    override val transactionIsolationLevel = Connection.TRANSACTION_READ_COMMITTED
    override val skippedSchema = setOf(
        "INFORMATION_SCHEMA",
        "PG_CATALOG",
        "PG_TOAST",
    )

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
                "${name.toUpperCase()} ${toSQLType(type)},"
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
    suspend fun importFromCSV(database: String, collection: String, schema: String?, content: ByteArray) {
        val csvData = readCSV(content)
        createTableAndWrite(database, collection, schema, csvData.fields, csvData.records)
    }
}