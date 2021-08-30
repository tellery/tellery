import { useEffect, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import { BlockTitleAssetsAtoms } from '../store/blockTitle'

export const useBlockTitleAssets = (storyId: string, blockId: string) => {
  const [cachedContent, setCachedContent] = useState<any>(null)
  const recoilValue = useRecoilValueLoadable(BlockTitleAssetsAtoms({ storyId, blockId }))

  useEffect(() => {
    if (recoilValue.state === 'hasValue' && recoilValue.contents !== cachedContent) {
      setCachedContent(recoilValue.contents)
    }
  })

  return cachedContent
}
