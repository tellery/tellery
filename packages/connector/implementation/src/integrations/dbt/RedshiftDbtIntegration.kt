package io.tellery.integrations

import io.tellery.connectors.fields.RedshiftFields
import io.tellery.entities.NewProfile

@DbtIntegrationType("Redshift")
class RedshiftDbtIntegration : DbtIntegration() {

    override fun transformToDbtProfile(profile: NewProfile): RedshiftDbtProfile {
        return RedshiftDbtProfile(
            host = getValueOrThrowException(profile, RedshiftFields.ENDPOINT),
            port = getValueOrThrowException(profile, RedshiftFields.PORT).toInt(),
            user = getValueOrThrowException(profile, RedshiftFields.USERNAME),
            password = getValueOrThrowException(profile, RedshiftFields.PASSWORD),
            dbname = getValueOrThrowException(profile, RedshiftFields.DATABASE),
            schema = getValueOrThrowException(profile, RedshiftFields.SCHEMA)
        )
    }

    class RedshiftDbtProfile(
        val host: String,
        val port: Int,
        val user: String,
        val password: String,
        val dbname: String,
        val schema: String
    ) : BaseDbtProfile("redshift")
}