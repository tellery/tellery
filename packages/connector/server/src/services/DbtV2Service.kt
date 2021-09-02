package io.tellery.services

import com.google.protobuf.Empty
import io.tellery.grpc.DbtV2CoroutineGrpc
import io.tellery.grpc.GenerateKeyPairResponseV2
import io.tellery.grpc.PullRepoResponseV2
import io.tellery.grpc.PushRepoRequestV2
import io.tellery.managers.DbtManagerV2

class DbtV2Service(
    private val dbtManagerV2: DbtManagerV2
) : DbtV2CoroutineGrpc.DbtV2ImplBase() {

    override suspend fun generateKeyPair(request: Empty): GenerateKeyPairResponseV2 {
        return GenerateKeyPairResponseV2 {
            publicKey = dbtManagerV2.generateKeyPair()
        }
    }

    override suspend fun pullRepo(request: Empty): PullRepoResponseV2 {
        dbtManagerV2.pullRepo()
        return PullRepoResponseV2 {
            addAllBlocks(dbtManagerV2.listBlocks())
        }
    }

    override suspend fun pushRepo(request: PushRepoRequestV2): Empty {
        dbtManagerV2.pushRepo(request.blocksList)
        return Empty.getDefaultInstance()
    }
}