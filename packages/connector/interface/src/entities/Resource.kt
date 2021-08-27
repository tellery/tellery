package entities

data class NewProfile(
    // unique id
    var id: String,
    var type: String,
    var credential: String?,
    var configs: Map<String, String?>
)

data class Integration(
    // unique id
    var id: Int?,
    var profileId: String,
    var type: String,
    var configs: Map<String, String?>
)
