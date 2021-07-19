import { TelleryStoryBlocks } from '@app/store/block'
import { useRecoilValue } from 'recoil'

export const useStoryBlocksMap = (storyId: string) => {
  return useRecoilValue(TelleryStoryBlocks(storyId))
}
