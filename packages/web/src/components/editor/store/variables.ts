import { QuerySnapshotAtom, TelleryStoryBlocks } from '@app/store/block'
import { Editor } from '@app/types'
import { BLOCK_ID_REGX, VARIABLE_REGEX } from '@app/utils'
import * as math from 'mathjs'
import { atomFamily, selectorFamily } from 'recoil'
import invariant from 'tiny-invariant'

const VARIABLE_PREIFX = 'telleryvariable'

function* varibleNameMaker() {
  let index = 0
  while (true) {
    index++
    yield `${VARIABLE_PREIFX}${index}`
  }
}

export const StoryVariables = selectorFamily<Record<string, { defaultValue: unknown; blockId: string }>, string>({
  key: 'StoryVariables',
  get:
    (storyId) =>
    ({ get }) => {
      const result: Record<string, { defaultValue: unknown; blockId: string }> = {}
      const blocksMap = get(TelleryStoryBlocks(storyId))

      Object.values(blocksMap).forEach((block) => {
        if (block.type === Editor.BlockType.Control) {
          const controlBlock = block as Editor.ControlBlock
          result[controlBlock.content.name] = {
            defaultValue: controlBlock?.content?.defaultValue ?? null,
            blockId: block.id
          }
        }
      })

      // console.log('control story variables', result)

      return result
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const VariableAtomFamilyDefault = selectorFamily<unknown, { storyId: string; name: string }>({
  key: 'VariableAtomFamily/Default',
  get:
    ({ storyId, name }) =>
    async ({ get }) => {
      const variables = get(StoryVariables(storyId))
      return variables[name]?.defaultValue
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const VariableAtomFamily = atomFamily<unknown, { storyId: string; name: string }>({
  key: 'VariableAtomFamily',
  default: VariableAtomFamilyDefault
})

export const FormulaSelectorFamily = selectorFamily<any, { storyId: string; formula: string }>({
  key: 'FormulaSelectorFamily',
  get:
    ({ storyId, formula }) =>
    async ({ get }) => {
      const scope: Record<string, any> = {}
      const variableNameGen = varibleNameMaker()

      const replacedVariablesFormula = formula
        .replace(BLOCK_ID_REGX, (matchString) => {
          const blockId = matchString.slice(2, -2)
          const variableName = variableNameGen.next().value
          invariant(variableName, 'variableName is falsy')
          const snapshot = get(QuerySnapshotAtom({ blockId }))
          scope[variableName] = snapshot ? math.evaluate(JSON.stringify(snapshot.data?.records ?? [[]])) : NaN
          return variableName
        })
        .replace(VARIABLE_REGEX, (variableString) => {
          const variableName = variableString.slice(2, -2)
          scope[variableName] = get(VariableAtomFamily({ storyId, name: variableName }))
          return variableName
        })

      try {
        const node = math.parse(replacedVariablesFormula)
        const code = node.compile()
        const result = code.evaluate(scope)
        return new Promise((resolve) => setTimeout(() => resolve(result), 0))
      } catch (err) {
        return new Promise((resolve) => setTimeout(() => resolve(NaN), 0))
      }
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})
