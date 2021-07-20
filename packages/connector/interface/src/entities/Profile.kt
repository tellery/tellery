package io.tellery.entities

data class Profile(
    val type: String,
    val name: String,
    val configs: Map<String, String>,
    val jar: String? = null,
) {
    override fun equals(other: Any?): Boolean {
        if (other !is Profile) {
            return false
        }
        return  type == other.type &&
                name == other.name &&
                configs.entries.fold(true) {acc, (k,v) -> return acc && other.configs[k] == v}
    }

    override fun hashCode(): Int {
        var result = type.hashCode()
        result = 31 * result + name.hashCode()
        result = 31 * result + (jar?.hashCode() ?: 0)
        result = 31 * result + configs.hashCode()
        return result
    }
}

data class Credential(
    val certificate: String,
    val key: String,
)


data class ConnectorConfig(
    val profiles: List<Profile>,
    val credential: Credential?,
    val repo: List<String>?,
)
