import { useBlockSuspense } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { useEffect, useState } from 'react'
// eslint-disable-next-line camelcase
import { atomFamily, useRecoilState, useRecoilTransaction_UNSTABLE } from 'recoil'
import { uploadFilesAndUpdateBlocks } from '../DataFileType'

const BlockFileResource = atomFamily<{ file: File; status: 'IDLE' | 'PENDING' | 'FAIL' } | null, string>({
  key: 'BlockFileResource',
  default: null
})

export const useUploadResource = (blockId: string) => {
  const [resource, setResource] = useRecoilState(BlockFileResource(blockId))
  const block = useBlockSuspense(blockId)
  const [isLoading, setIsLoading] = useState(false)
  const workspace = useWorkspace()
  const commit = useCommit()

  useEffect(() => {
    if (!resource) return
    if (resource.status === 'IDLE') {
      setIsLoading(true)
      uploadFilesAndUpdateBlocks([resource.file], [block], workspace)
        .then((transcations) => {
          setResource(null)
          transcations.forEach((transcation) => commit({ transcation, storyId: block.storyId! }))
        })
        .catch((err) => {
          setResource((oldState) => {
            if (!oldState) return oldState
            return { ...oldState, status: 'FAIL' }
          })
          console.error(err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [block, commit, resource, setResource, workspace])

  return isLoading
}

export const useSetUploadResource = () => {
  const callback = useRecoilTransaction_UNSTABLE(
    ({ set }) =>
      ({ blockId, file }: { blockId: string; file: File }) => {
        // TODO: no any
        set(BlockFileResource(blockId) as any, { file: file, status: 'IDLE' })
      },
    []
  )

  return callback
}
