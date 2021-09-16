import { translateSmartQuery } from '@app/api'
import { WorkspaceAtom } from '@app/hooks/useWorkspace'
import { TelleryBlockAtom } from '@app/store/block'
import { Editor } from '@app/types'
import { VARIABLE_REGEX } from '@app/utils'
import { selectorFamily } from 'recoil'
import { VariableAtomFamily } from './variables'

export const QuerySelectorFamily = selectorFamily<string, { storyId: string; queryId: string }>({
  key: 'QuerySelectorFamily',
  get:
    ({ storyId, queryId }) =>
    async ({ get }) => {
      const queryBlock = get(TelleryBlockAtom(queryId)) as Editor.QueryBlock
      if (queryBlock.type === Editor.BlockType.SQL || queryBlock.type === Editor.BlockType.QueryBuilder) {
        const sql = (queryBlock as Editor.SQLBlock).content?.sql ?? ''
        const replacedSql = sql.replace(VARIABLE_REGEX, (name) => {
          const variable = get(VariableAtomFamily({ storyId, name: name.slice(2, -2) }))
          if (variable !== undefined) {
            if (typeof variable === 'string') return `'${variable}'`
            if (typeof variable === 'number') return `${variable}`
          }
          return name
        })
        return replacedSql
      }
      if (queryBlock.type === Editor.BlockType.SmartQuery) {
        const smartQueryBlock = queryBlock as Editor.SmartQueryBlock
        const workspace = get(WorkspaceAtom)
        if (!workspace) return ''
        const response = await translateSmartQuery(
          workspace,
          smartQueryBlock.content.queryBuilderId,
          smartQueryBlock.content?.metricIds,
          smartQueryBlock.content?.dimensions
        )
        return response.data.sql as string
      }
      return ''
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})
