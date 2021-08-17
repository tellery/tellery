import { TelleryBlockAtom } from '@app/store/block'
import { selectorFamily } from 'recoil'
import { extractEntitiesFromToken } from '..'
import { VariableAtomFamily } from './variables'

export const BlockTitleAssetsAtoms = selectorFamily<Record<string, any>, { blockId: string; storyId: string }>({
  key: 'BlockTitleAssetsAtoms',
  get:
    ({ blockId, storyId }) =>
    async ({ get }) => {
      const block = get(TelleryBlockAtom(blockId))
      const titleTokens = block.content?.title ?? []
      const result: Record<string, any> = {}

      for (const token of titleTokens) {
        const entity = extractEntitiesFromToken(token)
        if (entity.reference) {
          const referenceEntity = entity.reference
          if (referenceEntity[1] === 's') {
            const blockId = referenceEntity[2] as string
            const block = get(TelleryBlockAtom(blockId))
            result[blockId] = block
          }
        } else if (entity.formula) {
          const formula = entity.formula[1] as string
          const formulaResult = get(VariableAtomFamily({ storyId: storyId, formula }))
          result[formula] = formulaResult
        }
      }

      return result
    }
})
