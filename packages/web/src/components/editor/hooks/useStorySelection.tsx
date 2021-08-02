import { useRecoilState } from 'recoil'
import type { TellerySelection } from '../helpers'
import { TelleryStorySelection } from '../store/selection'

export const useStorySelection = (storyId: string) => {
  return useRecoilState<TellerySelection | null>(TelleryStorySelection(storyId))
}
