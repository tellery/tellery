package io.tellery.integrations

import io.tellery.connectors.fields.RedshiftFields
import io.tellery.entities.ProfileEntity

@DbtIntegrationType("Redshift")
class RedshiftDbtIntegration : DbtIntegration() {

    override fun transformToDbtProfile(profileEntity: ProfileEntity): RedshiftDbtProfile {
        return RedshiftDbtProfile(
            host = getValueOrThrowException(profileEntity, RedshiftFields.ENDPOINT),
            port = getValueOrThrowException(profileEntity, RedshiftFields.PORT).toInt(),
            user = getValueOrThrowException(profileEntity, RedshiftFields.USERNAME),
            password = getValueOrThrowException(profileEntity, RedshiftFields.PASSWORD),
            dbname = getValueOrThrowException(profileEntity, RedshiftFields.DATABASE),
            schema = getValueOrThrowException(profileEntity, RedshiftFields.SCHEMA)
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