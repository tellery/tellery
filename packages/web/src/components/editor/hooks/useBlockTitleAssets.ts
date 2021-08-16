import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import { BlockTitleAssetsAtoms } from '../store/blockTitle'

export const useBlockTitleAssets = (storyId: string, blockId: string) => {
  const { contents } = useRecoilValueLoadable(BlockTitleAssetsAtoms({ storyId, blockId }))
  return contents
}
