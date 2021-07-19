package io.tellery.services

import com.google.common.base.Strings
import com.google.protobuf.Empty
import io.tellery.common.dbt.DbtManager
import io.tellery.grpc.*
import io.tellery.services.Utils.withErrorWrapper

class DbtService : DbtCoroutineGrpc.DbtImplBase() {

    override suspend fun createRepo(request: CreateRepoRequest): CreateRepoResponse {
        return withErrorWrapper(request) {
            assert(!Strings.isNullOrEmpty(it.profileName))

            val publicKey = DbtManager.createRepo(it.profileName)
            CreateRepoResponse.newBuilder().setPublicKey(publicKey).build()
        }
    }

    override suspend fun pullRepo(request: PullRepoRequest): Empty {
        return withErrorWrapper(request) {
            assert(!Strings.isNullOrEmpty(it.profileName))

            DbtManager.pullRepo(it.profileName)
            Empty.getDefaultInstance()
        }
    }

    override suspend fun pushRepo(request: PushRepoRequest): Empty {
        return withErrorWrapper(request) {
            assert(!Strings.isNullOrEmpty(it.profileName))
            assert(it.blocksMap != null)

            DbtManager.pushRepo(it.profileName, it.blocksMap)
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
            assert(!Strings.isNullOrEmpty(it.profileName))
            
            val blocks = DbtManager.listBlocks(request.profileName)
            ListDbtBlocksResponse.newBuilder().addAllBlocks(blocks).build()
        }
    }
}