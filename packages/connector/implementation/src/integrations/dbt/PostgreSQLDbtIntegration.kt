package io.tellery.integrations

import io.tellery.connectors.fields.PostgreSQLFields
import io.tellery.entities.ProfileEntity

@DbtIntegrationType("PostgreSQL")
class PostgreSQLDbtIntegration : DbtIntegration() {

    override fun transformToDbtProfile(profileEntity: ProfileEntity): PostgreSQLDbtProfile {
        return PostgreSQLDbtProfile(
            host = getValueOrThrowException(profileEntity, PostgreSQLFields.ENDPOINT),
            port = getValueOrThrowException(profileEntity, PostgreSQLFields.PORT).toInt(),
            user = getValueOrThrowException(profileEntity, PostgreSQLFields.USERNAME),
            password = getValueOrThrowException(profileEntity, PostgreSQLFields.PASSWORD),
            dbname = getValueOrThrowException(profileEntity, PostgreSQLFields.DATABASE),
            schema = getValueOrThrowException(profileEntity, PostgreSQLFields.SCHEMA)
        )
    }

    class PostgreSQLDbtProfile(
        val host: String,
        val port: Int,
        val user: String,
        val password: String,
        val dbname: String,
        val schema: String
    ) : BaseDbtProfile("postgres")
}