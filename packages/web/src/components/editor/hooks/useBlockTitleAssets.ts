import { useEffect, useState } from 'react'
import { useRecoilValueLoadable } from 'recoil'
import { BlockTitleAssetsAtoms } from '../store/blockTitle'

export const useBlockTitleAssets = (storyId: string, blockId: string) => {
  const [cachedContent, setCachedContent] = useState<any>(null)
  const { contents, state } = useRecoilValueLoadable(BlockTitleAssetsAtoms({ storyId, blockId }))
  useEffect(() => {
    if (state === 'hasValue') {
      setCachedContent(contents)
    }
  }, [contents, state])

  return cachedContent
}
