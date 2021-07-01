package io.tellery.entities

data class ConnectionAuth(
    val username: String,
    val password: String?,
) {
    override fun equals(other: Any?): Boolean {
        if (other !is ConnectionAuth) {
            return false
        }
        return username == other.username && password == other.password
    }

    override fun hashCode(): Int {
        var result = username.hashCode()
        result = 31 * result + (password?.hashCode() ?: 0)
        return result
    }
}

data class Profile(
    val type: String,
    val name: String,
    val auth: ConnectionAuth?,
    val connectionStr: String,
    val jar: String?,
    val optionals: Map<String, String>?,
) {
    override fun equals(other: Any?): Boolean {
        if (other !is Profile) {
            return false
        }
        val partial = type == other.type &&
                name == other.name &&
                auth == other.auth &&
                connectionStr == other.connectionStr
        if (!partial) {
            return false
        }
        if ((optionals == null && other.optionals != null) || (optionals != null && other.optionals == null)) {
            return false
        }
        return optionals?.entries?.fold(true) { acc, (k, v) ->
            return acc && other.optionals?.get(k) == v
        } ?: true
    }

    override fun hashCode(): Int {
        var result = type.hashCode()
        result = 31 * result + name.hashCode()
        result = 31 * result + (auth?.hashCode() ?: 0)
        result = 31 * result + connectionStr.hashCode()
        result = 31 * result + (jar?.hashCode() ?: 0)
        result = 31 * result + (optionals?.hashCode() ?: 0)
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
