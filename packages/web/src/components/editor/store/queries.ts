import { translateSmartQuery } from '@app/api'
import { WorkspaceAtom } from '@app/hooks/useWorkspace'
import { TelleryBlockAtom } from '@app/store/block'
import { Editor } from '@app/types'
import { VARIABLE_REGEX } from '@app/utils'
import { selectorFamily } from 'recoil'
import { VariableAtomFamily, VariableAtomFamilyDefault } from './variables'

export const QuerySelectorFamily = selectorFamily<
  { sql: string; isTemp: boolean },
  { storyId: string; queryId: string }
>({
  key: 'QuerySelectorFamily',
  get:
    ({ storyId, queryId }) =>
    async ({ get }) => {
      const queryBlock = get(TelleryBlockAtom(queryId)) as Editor.QueryBlock
      let isTemp = false
      const getReplacedSql = (sql: string) => {
        const replacedSql = sql.replace(VARIABLE_REGEX, (name) => {
          const variableName = name.slice(2, -2)
          const variable = get(VariableAtomFamily({ storyId, name: variableName }))
          const defaultValue = get(VariableAtomFamilyDefault({ storyId, name: variableName }))
          const isDefault = defaultValue === variable
          if (isDefault !== true) {
            isTemp = true
          }
          if (variable !== undefined) {
            if (typeof variable === 'string') return `'${variable}'`
            if (typeof variable === 'number') return `${variable}`
          }
          return name
        })
        return { sql: replacedSql, isTemp: isTemp }
      }
      if (queryBlock.type === Editor.BlockType.SQL || queryBlock.type === Editor.BlockType.QueryBuilder) {
        return getReplacedSql((queryBlock as Editor.SQLBlock).content?.sql ?? '')
      }
      if (queryBlock.type === Editor.BlockType.SmartQuery) {
        const smartQueryBlock = queryBlock as Editor.SmartQueryBlock
        const workspace = get(WorkspaceAtom)
        if (!workspace) return { sql: '', isTemp: false }
        const response = await translateSmartQuery(
          workspace,
          smartQueryBlock.content.queryBuilderId,
          smartQueryBlock.content?.metricIds,
          smartQueryBlock.content?.dimensions,
          smartQueryBlock.content?.filters
        )
        return getReplacedSql(response.data.sql as string)
      }
      return { sql: '', isTemp: isTemp }
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})
