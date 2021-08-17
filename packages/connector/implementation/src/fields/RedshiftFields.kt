package io.tellery.connectors.fields

object RedshiftFields {
    const val USERNAME = "Username"
    const val PASSWORD = "Password"
    const val ENDPOINT = "Endpoint"
    const val PORT = "Port"
    const val DATABASE = "Database"
    // only for dbt, won't be used in the connection
    const val SCHEMA = "Schema"
    // only for importing csv
    const val S3_ACCESS_KEY = "S3 Access Key"
    const val S3_SECRET_KEY = "S3 Secret Key"
    const val S3_REGION = "S3 Region"
    const val S3_BUCKET = "S3 Bucket"
    const val S3_KEY_PREFIX = "S3 Key Prefix"
}
