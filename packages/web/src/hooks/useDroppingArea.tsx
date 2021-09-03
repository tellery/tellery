/* eslint-disable camelcase */
import { Direction } from '@app/types'
import { atom, atomFamily, useRecoilState, useRecoilTransaction_UNSTABLE, useRecoilValue } from 'recoil'

export interface BlockAreaInterface {
  blockId: string
  direction: Direction
}

export const BlockDroppingArea = atomFamily<BlockAreaInterface | null, string>({
  key: 'BlockDroppingArea',
  default: null
})

export const DroppingAreaAtom = atom<BlockAreaInterface | null>({
  key: 'DroppingAreaAtom',
  default: null
})

export const useDroppingArea = () => {
  return useRecoilState(DroppingAreaAtom)
}

export const useSetDroppingArea = () => {
  const callback = useRecoilTransaction_UNSTABLE<
    [BlockAreaInterface | null | ((oldValue: BlockAreaInterface | null) => BlockAreaInterface)]
  >(({ set, get }) => (newValueOrUpdater) => {
    let newValue = null
    const oldValue = get(DroppingAreaAtom)
    if (typeof newValueOrUpdater === 'function') {
      newValue = newValueOrUpdater(oldValue)
    } else {
      newValue = newValueOrUpdater
    }

    const currentDroppingBlockId = oldValue?.blockId
    const newBlockId = (newValue as BlockAreaInterface)?.blockId
    if (currentDroppingBlockId && currentDroppingBlockId !== newBlockId) {
      set(BlockDroppingArea(currentDroppingBlockId as string), null)
    }
    set(DroppingAreaAtom, newValue)
    set(BlockDroppingArea(newBlockId), newValue)
  })
  return callback
}

export const useDroppingAreaBlock = (id: string) => {
  const droppingArea = useRecoilValue(BlockDroppingArea(id))
  return droppingArea
}
