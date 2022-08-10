import { QuerySnapshotAtom, TelleryStoryBlocks } from '@app/store/block'
import { Editor } from '@app/types'
import { BLOCK_ID_REGX, VariableType, VARIABLE_REGEX } from '@app/utils'
import * as math from 'mathjs'
import { atomFamily, DefaultValue, selectorFamily } from 'recoil'
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
  defaultRawValue: string
  tempRawValue?: string
  currentRawValue: string
  currentValue: unknown
  blockId: string
  isDefault: boolean
  type: VariableType
}

export const variableRawValueToValue = (rawValue: string, type: VariableType) => {
  if (type === 'text') return rawValue
  if (type === 'macro') return rawValue
  if (type === 'number' || type === 'decimal') return parseInt(rawValue, 10)
  if (type === 'float') return parseFloat(rawValue)
  if (type === 'transclusion') return rawValue
  if (type === 'date') return rawValue
  return rawValue
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
            defaultRawValue: defaultValue,
            blockId: block.id,
            isDefault: true,
            currentRawValue: defaultValue,
            currentValue: variableRawValueToValue(defaultValue, controlBlock.content.type),
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

export const VariableTempRawValueAtomFamily = atomFamily<string | null, { storyId: string; name: string }>({
  key: 'VariableTempRawValueAtomFamily',
  default: null
})

export const VariableAtomFamily = selectorFamily<TelleryVariable | DefaultValue, { storyId: string; name: string }>({
  key: 'VariableAtomFamily',
  get:
    ({ storyId, name }) =>
    ({ get }) => {
      const variables = get(StoryVariables(storyId))
      const variable = variables[name]
      if (!variable) return new DefaultValue()
      const tempRawValue = get(VariableTempRawValueAtomFamily({ storyId, name }))
      const currentRawValue = tempRawValue ?? variable?.defaultRawValue ?? ''
      return {
        ...variable,
        tempRawValue,
        currentRawValue,
        currentValue: variableRawValueToValue(currentRawValue, variables[name]?.type),
        isDefault: currentRawValue === variable.defaultRawValue
      } as TelleryVariable
    },
  set:
    ({ storyId, name }) =>
    ({ get, set }, value) => {
      const variables = get(StoryVariables(storyId))
      const variable = variables[name]
      if (!variable) return
      if (value instanceof DefaultValue) return
      if (!value.tempRawValue) return
      set(VariableTempRawValueAtomFamily({ storyId, name }), value.tempRawValue!)
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
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
          scope[variableName] = variable instanceof DefaultValue ? null : variable.currentValue
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
