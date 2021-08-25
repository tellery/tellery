import { TelleryBlockAtom } from '@app/store/block'
import { useRecoilCallback } from 'recoil'

export const useFetchBlock = () => {
  const callback = useRecoilCallback(
    (recoil) => (blockId: string) => {
      return recoil.snapshot.getPromise(TelleryBlockAtom(blockId))
    },
    []
  )
  return callback
}
