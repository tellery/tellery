package io.tellery.connectors.profiles

import com.fasterxml.jackson.annotation.JsonInclude
import io.tellery.connectors.annotations.Dbt
import io.tellery.connectors.fields.PostgreSQLFields
import io.tellery.entities.Profile

@Deprecated("")
@JsonInclude(JsonInclude.Include.NON_NULL)
@Dbt(type = "PostgreSQL")
class PostgreSQLDbtProfile(profile: Profile) : BaseDbtProfile() {

    val host: String
    val port: Int
    val user: String
    val password: String
    val dbname: String
    val schema: String

    init {
        this.type = "postgres"
        this.host = getValueOrThrowException(profile, PostgreSQLFields.ENDPOINT)
        this.port = getValueOrThrowException(profile, PostgreSQLFields.PORT).toInt()
        this.user = getValueOrThrowException(profile, PostgreSQLFields.USERNAME)
        this.password = getValueOrThrowException(profile, PostgreSQLFields.PASSWORD)
        this.dbname = getValueOrThrowException(profile, PostgreSQLFields.DATABASE)
        this.schema = getValueOrThrowException(profile, PostgreSQLFields.SCHEMA)
    }
}
