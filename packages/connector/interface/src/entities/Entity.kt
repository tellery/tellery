package io.tellery.entities

data class ProfileEntity(
    var id: String,
    var type: String,
    var configs: Map<String, String?>
) {
    override fun equals(other: Any?): Boolean {
        if (other !is ProfileEntity) {
            return false
        }
        return type == other.type &&
                id == other.id &&
                configs.entries.fold(true) { acc, (k, v) -> return acc && other.configs[k] == v }
    }

    override fun hashCode(): Int {
        var result = type.hashCode()
        result = 31 * result + id.hashCode()
        result = 31 * result + configs.hashCode()
        return result
    }
}

data class IntegrationEntity(
    var id: Int?,
    var profileId: String,
    var type: String,
    var configs: Map<String, String?>
)

data class ProfileSpecEntity(val type: String, val tokenizer: String, val queryBuilderSpec: String)