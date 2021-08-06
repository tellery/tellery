package io.tellery.connectors.profiles

import com.fasterxml.jackson.annotation.JsonInclude
import io.tellery.connectors.annotations.Dbt
import io.tellery.connectors.fields.RedshiftFields
import io.tellery.entities.Profile

@JsonInclude(JsonInclude.Include.NON_NULL)
@Dbt(type = "Redshift")
class RedshiftDbtProfile(profile: Profile) : BaseDbtProfile(profile) {
    val host: String
    val port: Int
    val user: String
    val password: String

    init {
        this.type = "redshift"
        this.host = getValueOrThrowException(profile, RedshiftFields.ENDPOINT)
        this.port = getValueOrThrowException(profile, RedshiftFields.PORT).toInt()
        this.user = getValueOrThrowException(profile, RedshiftFields.USERNAME)
        this.password = getValueOrThrowException(profile, RedshiftFields.PASSWORD)
        this.dbname = getValueOrThrowException(profile, RedshiftFields.DATABASE)
    }
}
