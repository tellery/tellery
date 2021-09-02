package io.tellery.integrations

import io.tellery.connectors.fields.PostgreSQLFields
import io.tellery.entities.NewProfile

@Type("PostgreSQL")
class PostgreSQLDbtIntegration : DbtIntegration() {

    override fun transformToDbtProfile(profile: NewProfile): PostgreSQLDbtProfile {
        return PostgreSQLDbtProfile(
            host = getValueOrThrowException(profile, PostgreSQLFields.ENDPOINT),
            port = getValueOrThrowException(profile, PostgreSQLFields.PORT).toInt(),
            user = getValueOrThrowException(profile, PostgreSQLFields.USERNAME),
            password = getValueOrThrowException(profile, PostgreSQLFields.PASSWORD),
            dbname = getValueOrThrowException(profile, PostgreSQLFields.DATABASE),
            schema = getValueOrThrowException(profile, PostgreSQLFields.SCHEMA)
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