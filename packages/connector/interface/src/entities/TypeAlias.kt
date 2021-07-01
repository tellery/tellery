package io.tellery.entities

import arrow.core.Either


typealias QueryResultWrapper = Either<List<TypeField>, List<Any>>
typealias ImportHandler = suspend (database: String, collection: String, schema: String?, content: ByteArray) -> Unit
