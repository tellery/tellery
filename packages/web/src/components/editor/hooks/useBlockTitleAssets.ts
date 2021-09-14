import { dequal } from 'dequal'
import { useEffect, useState } from 'react'
import { useRecoilValueLoadable, noWait, selectorFamily } from 'recoil'
import { TelleryBlockAtom } from '@app/store/block'
import { Editor } from '@app/types'
import { extractEntitiesFromToken } from '..'
import { FormulaSelectorFamily } from '../store/variables'

const BlockTitleAssetsAtoms = selectorFamily<Record<string, any>, { blockId: string; storyId: string }>({
  key: 'BlockTitleAssetsAtoms',
  get:
    ({ blockId, storyId }) =>
    async ({ get }) => {
      const result: Record<string, any> = {}
      const blockLoadable = get(noWait(TelleryBlockAtom(blockId)))
      if (blockLoadable.state === 'hasValue' && blockLoadable.contents) {
        const block = blockLoadable.contents as Editor.Block
        const titleTokens = block.content?.title ?? []

        for (const token of titleTokens) {
          const entity = extractEntitiesFromToken(token)
          if (entity.reference) {
            const referenceEntity = entity.reference
            if (referenceEntity[1] === 's') {
              const referenceBlockId = referenceEntity[2] as string
              const referenceBlockLoadable = get(noWait(TelleryBlockAtom(referenceBlockId)))
              if (referenceBlockLoadable.state === 'hasValue' && referenceBlockLoadable.contents) {
                const referenceBlock = referenceBlockLoadable.contents
                // result.set(referenceBlockId, referenceBlock)
                result[referenceBlockId] = referenceBlock
              }
            }
          } else if (entity.formula) {
            const formula = entity.formula[1] as string
            const formulaResultLoadable = get(noWait(FormulaSelectorFamily({ storyId, formula })))
            if (formulaResultLoadable.state === 'hasValue' && formulaResultLoadable.contents !== undefined) {
              const formulaResult = formulaResultLoadable.contents
              result[formula] = formulaResult
              // result.set(formula, formulaResult)
            }
          }
        }
      }
      // TODO: workaround for recoil bug, see https://github.com/facebookexperimental/Recoil/issues/103
      return new Promise((resolve) => setTimeout(() => resolve(result), 0))
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const useBlockTitleAssets = (storyId: string, blockId: string) => {
  const [cachedContent, setCachedContent] = useState<any>(null)
  const recoilValue = useRecoilValueLoadable(BlockTitleAssetsAtoms({ storyId, blockId }))

  useEffect(() => {
    if (recoilValue.state === 'hasValue') {
      setCachedContent((oldContent: any) => {
        if (dequal(oldContent, recoilValue.contents)) {
          return oldContent
        }
        return recoilValue.contents
      })
    }
  }, [recoilValue])

  return cachedContent
}
