package io.tellery.services

import com.google.common.base.Strings
import com.google.protobuf.Empty
import io.tellery.common.dbt.DbtManager
import io.tellery.common.withErrorWrapper
import io.tellery.grpc.*

class DbtService : DbtCoroutineGrpc.DbtImplBase() {

    override suspend fun createRepo(request: CreateRepoRequest): CreateRepoResponse {
        return withErrorWrapper(request) {
            assert(!Strings.isNullOrEmpty(it.profile)) { "Profile name cannot be null or empty." }

            val publicKey = DbtManager.createRepo(it.profile)
            CreateRepoResponse.newBuilder().setPublicKey(publicKey).build()
        }
    }

    override suspend fun pullRepo(request: PullRepoRequest): Empty {
        return withErrorWrapper(request) {
            assert(!Strings.isNullOrEmpty(it.profile)) { "Profile name cannot be null or empty." }

            DbtManager.pullRepo(it.profile)
            Empty.getDefaultInstance()
        }
    }

    override suspend fun pushRepo(request: PushRepoRequest): Empty {
        return withErrorWrapper(request) {
            assert(!Strings.isNullOrEmpty(it.profile)) { "Profile name cannot be null or empty." }
            assert(it.blocksMap != null) { "Block map cannot be null." }

            DbtManager.pushRepo(it.profile, it.blocksMap)
            Empty.getDefaultInstance()
        }
    }

    override suspend fun refreshWorkspace(request: Empty): Empty {
        return withErrorWrapper(request) {
            DbtManager.initDbtWorkspace()
            Empty.getDefaultInstance()
        }
    }

    override suspend fun listDbtBlocks(request: ListDbtBlocksRequest): ListDbtBlocksResponse {
        return withErrorWrapper(request) {
            assert(!Strings.isNullOrEmpty(it.profile)) { "Profile name cannot be null or empty." }

            val blocks = DbtManager.listBlocks(request.profile)
            ListDbtBlocksResponse.newBuilder().addAllBlocks(blocks).build()
        }
    }
}
