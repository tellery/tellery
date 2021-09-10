import { TelleryBlockAtom, TellerySnapshotAtom } from '@app/store/block'
import type { Editor } from '@app/types'
import { BLOCK_ID_REGX, isBlockId } from '@app/utils'
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

const replaceIdsWithVariable = (formula: string) => {
  let result = formula
  const vriableMap: Record<string, string> = {}

  const variableNameGen = varibleNameMaker()

  while (true) {
    const match = isBlockId(result)
    if (match) {
      const blockId = match[1] as string
      const variableName = variableNameGen.next().value
      invariant(variableName, 'variableName is falsy')
      result = result.replace(BLOCK_ID_REGX, variableName)
      vriableMap[variableName] = blockId
    } else {
      break
    }
  }

  return [vriableMap, result] as [Record<string, string>, string]
}

export const VariableAtomFamily = atomFamily<unknown, { storyId: string; name: string }>({
  key: 'VariableAtomFamily',
  default: undefined
})

export const FormulaSelectorFamily = selectorFamily<any, { storyId: string; formula: string }>({
  key: 'FormulaSelectorFamily',
  get:
    ({ storyId, formula }) =>
    async ({ get }) => {
      const scope: Record<string, any> = {}
      const [variableMap, replacedFormula] = replaceIdsWithVariable(formula)

      for (const variableName in variableMap) {
        const blockId = variableMap[variableName]
        const block = get(TelleryBlockAtom(blockId)) as Editor.SQLBlock

        if (!block) return NaN

        const snapshotId = block.content?.snapshotId
        if (!snapshotId) return NaN

        const snapshot = get(TellerySnapshotAtom(snapshotId))
        if (!snapshot) return NaN

        scope[variableName] = math.evaluate(JSON.stringify(snapshot.data?.records ?? [[]]))
      }

      try {
        const node = math.parse(replacedFormula)
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
