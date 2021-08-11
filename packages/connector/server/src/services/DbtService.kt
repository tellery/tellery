package io.tellery.services

import com.google.common.base.Strings
import com.google.protobuf.Empty
import io.tellery.common.dbt.DbtManager
import io.tellery.common.withErrorWrapper
import io.tellery.grpc.*

class DbtService : DbtCoroutineGrpc.DbtImplBase() {

    override suspend fun generateKeyPair(request: GenerateKeyPairRequest): GenerateKeyPairResponse {
        return withErrorWrapper(request) { req ->
            assert(!Strings.isNullOrEmpty(req.profile)) { "Profile name cannot be null or empty." }

            val publicKey = DbtManager.generateRepoKeyPair(req.profile)

            GenerateKeyPairResponse {
                this.publicKey = publicKey
            }
        }
    }

    override suspend fun pullRepo(request: PullRepoRequest): PullRepoResponse {
        return withErrorWrapper(request) { req ->
            assert(!Strings.isNullOrEmpty(req.profile)) { "Profile name cannot be null or empty." }

            DbtManager.pullRepo(req.profile)
            val blocks = DbtManager.listBlocks(req.profile)

            PullRepoResponse {
                addAllBlocks(blocks)
            }
        }
    }

    override suspend fun pushRepo(request: PushRepoRequest): Empty {
        return withErrorWrapper(request) { req ->
            assert(!Strings.isNullOrEmpty(req.profile)) { "Profile name cannot be null or empty." }
            assert(req.blocksList != null) { " Blocks cannot be null" }

            DbtManager.pushRepo(req.profile, req.blocksList)
            Empty.getDefaultInstance()
        }
    }

    override suspend fun refreshWorkspace(request: Empty): Empty {
        return withErrorWrapper(request) {
            DbtManager.initDbtWorkspace()
            Empty.getDefaultInstance()
        }
    }
}
