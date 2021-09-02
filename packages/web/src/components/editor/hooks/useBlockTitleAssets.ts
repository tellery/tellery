import { dequal } from 'dequal'
import { useState, useEffect } from 'react'
import { useRecoilValue, useRecoilValueLoadable } from 'recoil'
import { BlockTitleAssetsAtoms } from '../store/blockTitle'

export const useBlockTitleAssets = (storyId: string, blockId: string) => {
  const [cachedContent, setCachedContent] = useState<any>(null)
  const recoilValue = useRecoilValue(BlockTitleAssetsAtoms({ storyId, blockId }))
  useEffect(() => {
    setCachedContent((oldContent: any) => {
      if (dequal(oldContent, recoilValue)) {
        return oldContent
      }
      return recoilValue
    })
  }, [recoilValue])

  return cachedContent
}
