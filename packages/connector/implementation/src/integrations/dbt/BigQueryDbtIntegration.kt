package io.tellery.integrations

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.module.kotlin.readValue
import io.tellery.connectors.BigQueryConnector
import io.tellery.connectors.fields.BigQueryFields
import io.tellery.entities.NewProfile
import java.util.*

@Type("BigQuery")
class BigQueryDbtIntegration : DbtIntegration() {

    override fun transformToDbtProfile(profile: NewProfile): BigQueryDbtProfile {
        profile.let {
            val jsonBody = Base64
                .getDecoder()
                .decode(getValueOrThrowException(it, BigQueryFields.KEY_FILE))
                .decodeToString()

            val keyfileJson: BigQueryConnector.BigQueryKeyBody = mapper.readValue(jsonBody)

            return BigQueryDbtProfile(
                method = "service-account-json",
                priority = "interactive",
                dataset = getValueOrThrowException(it, BigQueryFields.DATASET),
                keyfileJson = keyfileJson,
                project = keyfileJson.projectId
            )
        }
    }

    class BigQueryDbtProfile(
        val method: String,
        val priority: String,
        val dataset: String,
        val project: String,
        @JsonProperty("keyfile_json") val keyfileJson: BigQueryConnector.BigQueryKeyBody
    ) : BaseDbtProfile("bigquery")
}