package io.tellery.connectors.profiles

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonProperty
import com.google.gson.Gson
import io.tellery.connectors.BigQueryConnector
import io.tellery.connectors.annotations.Dbt
import io.tellery.connectors.fields.BigQueryFields
import io.tellery.entities.Profile
import java.util.*

@Deprecated("")
@JsonInclude(JsonInclude.Include.NON_NULL)
@Dbt(type = "BigQuery")
class BigQueryDbtProfile(profile: Profile) : BaseDbtProfile() {

    private val gson = Gson()

    val method: String
    val priority: String
    val dataset: String
    val project: String

    @JsonProperty("keyfile_json")
    val keyfileJson: BigQueryConnector.BigQueryKeyBody

    init {
        this.type = "bigquery"
        this.method = "service-account-json"
        this.priority = "interactive"
        this.dataset = getValueOrThrowException(profile, BigQueryFields.DATASET)
        val jsonBody = Base64
            .getDecoder()
            .decode(getValueOrThrowException(profile, BigQueryFields.KEY_FILE))
            .decodeToString()
        this.keyfileJson = gson.fromJson(jsonBody, BigQueryConnector.BigQueryKeyBody::class.java)
        this.project = keyfileJson.projectId
    }
}
