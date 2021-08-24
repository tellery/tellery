/* eslint-disable camelcase */
import { TelleryBlockAtom } from '@app/store/block'
import { useCallback } from 'react'
import { useGetRecoilValueInfo_UNSTABLE, useRecoilTransaction_UNSTABLE } from 'recoil'

export const useGetBlock = () => {
  const getRecoilValue = useGetRecoilValueInfo_UNSTABLE()
  const getBlockValue = useCallback(
    (blockId: string) => {
      const { loadable } = getRecoilValue(TelleryBlockAtom(blockId))
      return loadable?.contents
    },
    [getRecoilValue]
  )
  return getBlockValue
}
