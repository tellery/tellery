package io.tellery.entities

data class ProfileEntity(
    // unique id
    var id: String,
    var type: String,
    var credential: String?,
    var configs: Map<String, String?>
)

data class IntegrationEntity(
    // unique id
    var id: Int?,
    var profileId: String,
    var type: String,
    var configs: Map<String, String?>
)
