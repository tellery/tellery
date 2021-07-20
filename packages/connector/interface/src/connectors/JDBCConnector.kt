package io.tellery.connectors

import arrow.core.Either
import com.github.michaelbull.jdbc.context.CoroutineDataSource
import com.github.michaelbull.jdbc.context.dataSource
import com.zaxxer.hikari.HikariDataSource
import io.tellery.entities.*
import io.tellery.utils.queryRemark
import io.tellery.utils.toBase64
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.plus
import java.io.InputStream
import java.sql.Connection
import java.sql.ResultSet


abstract class JDBCConnector : BaseConnector() {

    abstract val driverClassName: String
    open val transactionIsolationLevel = Connection.TRANSACTION_NONE
    open val skippedSchema: Set<String> = setOf(
        "INFORMATION_SCHEMA"
    )
    open val defaultSchema: String? = "PUBLIC"


    protected lateinit var dataSource: HikariDataSource

    val dbConnection: Connection
        get() =
            scope.coroutineContext.dataSource.connection


    abstract fun buildConnectionStr(profile: Profile): String

    open fun additionalConfigurationForDataSource(profile: Profile) {
        this.dataSource.apply {
            maximumPoolSize = 15
            minimumIdle = 5
            connectionTimeout = 5 * 60 * 1000
            maxLifetime = 15 * 60 * 1000
            keepaliveTime = 60 * 1000
        }
    }

    override fun initByProfile(profile: Profile) {

        // Check driverClassName first, since the driver might be loaded from external
        try {
            Class.forName(driverClassName)
        } catch (e: ClassNotFoundException) {
            throw JDBCDriverClassNotFoundException(profile.name, driverClassName)
        }

        this.dataSource = HikariDataSource().apply {
            jdbcUrl = buildConnectionStr(profile)
            profile.auth?.username?.let {
                username = it
            }
            profile.auth?.password?.let {
                password = it
            }
            driverClassName = this@JDBCConnector.driverClassName
        }

        this.dataSource.apply {
            maximumPoolSize = 15
            minimumIdle = 5
            connectionTimeout = 5 * 60 * 1000
            maxLifetime = 15 * 60 * 1000
            keepaliveTime = 60 * 1000
        }

        this.additionalConfigurationForDataSource(profile)

        scope += CoroutineDataSource(this.dataSource)
    }


    override suspend fun getDatabases(): List<String> {
        dbConnection.use { conn ->
            conn.metaData.catalogs.use {
                return generateSequence {
                    if (it.next()) {
                        it.getString(1)
                    } else null
                }.toList()
            }
        }
    }


    open fun shouldKeepSchema(field: CollectionField): Boolean {
        return field.schema?.uppercase() !in skippedSchema
    }

    open fun isDefaultSchema(field: CollectionField): Boolean {
        return defaultSchema != null && field.schema?.uppercase() == defaultSchema
    }

    override suspend fun getCollections(dbName: String): List<CollectionField> {
        return dbConnection.use { conn ->
            conn.metaData.getTables(dbName, "%", "%", arrayOf("TABLE")).use {
                generateSequence {
                    if (it.next()) {
                        CollectionField(it.getString(3), it.getString(2))
                    } else null
                }
                    .filter(::shouldKeepSchema)
                    .map {
                        if (isDefaultSchema(it)) CollectionField(it.collection, null) else it
                    }.toList()
            }
        }
    }


    override suspend fun getCollectionSchema(
        dbName: String,
        collectionName: String,
        schemaName: String?,
    ): List<TypeField> {
        return dbConnection.use { conn ->
            conn.metaData.getColumns(dbName, schemaName, collectionName, "%").use {
                generateSequence {
                    if (it.next()) {
                        TypeField(it.getString("COLUMN_NAME"), it.getInt("DATA_TYPE"))
                    } else null
                }.toList()
            }
        }
    }


    override suspend fun query(ctx: QueryContext, sendToChannel: suspend (QueryResultWrapper) -> Unit) {
        dbConnection.apply {
            transactionIsolation = transactionIsolationLevel
        }.use { conn ->
            conn.createStatement(ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY).apply {
                fetchDirection = ResultSet.FETCH_FORWARD
            }.use { stmt ->
                try {
                    stmt.executeQuery(queryRemark(ctx)).use {
                        val rsMeta = it.metaData
                        val fields: List<TypeField> = (1..rsMeta.columnCount).map {
                            with(rsMeta) {
                                TypeField(getColumnLabel(it), getColumnType(it))
                            }
                        }
                        sendToChannel(Either.Left(fields))
                        var rowCount = 0
                        while (it.next()) {
                            rowCount++
                            if (rowCount > ctx.maxRows) {
                                throw TruncateException()
                            }
                            sendToChannel(Either.Right(
                                fields.indices.map { colIndex ->
                                    when (val tmp = it.getObject(colIndex + 1)) {
                                        is InputStream -> tmp.readBytes().toBase64()
                                        else -> tmp
                                    }
                                }
                            ))
                        }
                    }
                } catch (e: Exception) {
                    when (e) {
                        is CancellationException -> {
                            logger.info("Query ${ctx.questionId} has been cancelled")
                            stmt.cancel()
                        }
                        is TruncateException -> {
                            stmt.cancel()
                            throw e
                        }
                        else -> throw e
                    }
                }
            }
        }
    }
}


