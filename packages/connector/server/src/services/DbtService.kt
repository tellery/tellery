package io.tellery.services

import com.google.protobuf.Empty
import io.tellery.common.withErrorWrapper
import io.tellery.grpc.*
import io.tellery.managers.DbtManager

class DbtService(private val dbtManager: DbtManager) :
    DbtServiceCoroutineGrpc.DbtServiceImplBase() {

    override suspend fun generateKeyPair(request: Empty): GenerateKeyPairResponse {
        return withErrorWrapper {
            GenerateKeyPairResponse {
                publicKey = dbtManager.generateKeyPair()
            }
        }
    }

    override suspend fun pullRepo(request: Empty): PullRepoResponse {
        return withErrorWrapper {
            dbtManager.pullRepo()
            PullRepoResponse {
                addAllBlocks(dbtManager.listBlocks())
            }

        }
    }

    override suspend fun pushRepo(request: PushRepoRequest): Empty {
        return withErrorWrapper {
            dbtManager.pushRepo(request.blocksList)
            Empty.getDefaultInstance()
        }
    }

    override suspend fun getDiffs(request: Empty): GetDiffsResponse {
        return withErrorWrapper {
            GetDiffsResponse {
                count = dbtManager.getRemoteDiffs()
            }
        }
    }
}