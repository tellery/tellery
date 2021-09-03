import { TelleryBlockAtom } from '@app/store/block'
import { Editor } from '@app/types'
import { noWait, selectorFamily } from 'recoil'
import { extractEntitiesFromToken } from '..'
import { VariableAtomFamily } from './variables'

export const BlockTitleAssetsAtoms = selectorFamily<Record<string, any>, { blockId: string; storyId: string }>({
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
                result[referenceBlockId] = referenceBlock
              }
            }
          } else if (entity.formula) {
            const formula = entity.formula[1] as string
            const formulaResultLoadable = get(noWait(VariableAtomFamily({ storyId: storyId, formula })))
            if (formulaResultLoadable.state === 'hasValue' && formulaResultLoadable.contents !== undefined) {
              const formulaResult = formulaResultLoadable.contents
              result[formula] = formulaResult
            }
          }
        }
      }
      return result
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})
