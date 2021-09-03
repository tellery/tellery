package io.tellery.services

import com.google.protobuf.Empty
import io.tellery.grpc.DbtCoroutineGrpc
import io.tellery.grpc.GenerateKeyPairResponse
import io.tellery.grpc.PullRepoResponse
import io.tellery.grpc.PushRepoRequest
import io.tellery.managers.DbtManager

class DbtService(private val dbtManager: DbtManager) : DbtCoroutineGrpc.DbtImplBase() {

    override suspend fun generateKeyPair(request: Empty): GenerateKeyPairResponse {
        return GenerateKeyPairResponse {
            publicKey = dbtManager.generateKeyPair()
        }
    }

    override suspend fun pullRepo(request: Empty): PullRepoResponse {
        dbtManager.pullRepo()
        return PullRepoResponse {
            addAllBlocks(dbtManager.listBlocks())
        }
    }

    override suspend fun pushRepo(request: PushRepoRequest): Empty {
        dbtManager.pushRepo(request.blocksList)
        return Empty.getDefaultInstance()
    }
}