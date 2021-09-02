import { useRecoilValue } from 'recoil'
import { BlockTitleAssetsAtoms } from '../store/blockTitle'

export const useBlockTitleAssets = (storyId: string, blockId: string) => {
  const recoilValue = useRecoilValue(BlockTitleAssetsAtoms({ storyId, blockId }))

  return recoilValue
}
