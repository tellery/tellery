import { useWorkspace } from '@app/context/workspace'
import { useBlockSuspense } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useEffect, useState } from 'react'
import { atomFamily, useRecoilCallback, useRecoilState } from 'recoil'
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
  const callback = useRecoilCallback(
    ({ set }) =>
      ({ blockId, file }: { blockId: string; file: File }) => {
        set(BlockFileResource(blockId), { file: file, status: 'IDLE' })
      },
    []
  )

  return callback
}
