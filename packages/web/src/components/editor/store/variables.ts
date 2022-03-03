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

export interface TelleryVariable {
  defaultValue: unknown
  currentValue: unknown
  blockId: string
  type: 'text' | 'number' | 'transclusion' | 'decimal' | 'float'
}

export const StoryVariables = selectorFamily<Record<string, TelleryVariable>, string>({
  key: 'StoryVariables',
  get:
    (storyId) =>
    ({ get }) => {
      const result: Record<string, TelleryVariable> = {}
      const blocksMap = get(TelleryStoryBlocks(storyId))

      Object.values(blocksMap).forEach((block) => {
        if (block.type === Editor.BlockType.Control) {
          const controlBlock = block as Editor.ControlBlock
          const defaultValue = controlBlock?.content?.defaultValue ?? null
          result[controlBlock.content.name] = {
            defaultValue: defaultValue,
            currentValue: defaultValue,
            blockId: block.id,
            type: controlBlock?.content.type ?? 'text'
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

export const VariableAtomFamilyDefault = selectorFamily<TelleryVariable, { storyId: string; name: string }>({
  key: 'VariableAtomFamily/Default',
  get:
    ({ storyId, name }) =>
    async ({ get }) => {
      const variables = get(StoryVariables(storyId))
      return variables[name]
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})

export const VariableAtomFamily = atomFamily<TelleryVariable, { storyId: string; name: string }>({
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
          const variable = get(VariableAtomFamily({ storyId, name: variableName }))
          scope[variableName] = variable.currentValue
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
