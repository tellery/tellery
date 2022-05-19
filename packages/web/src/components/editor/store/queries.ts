import { TelleryBlockAtom } from '@app/store/block'
import { Editor } from '@app/types'
import { VARIABLE_REGEX } from '@app/utils'
import { DefaultValue, selectorFamily } from 'recoil'
import { VariableAtomFamily } from './variables'

export const QuerySelectorFamily = selectorFamily<
  {
    query: {
      id: string
      type: 'sql' | 'smart'
      data: string
    }
    isTemp: boolean
  },
  { storyId: string; queryId: string }
>({
  key: 'QuerySelectorFamily',
  get:
    ({ storyId, queryId }) =>
    async ({ get }) => {
      const queryBlock = get(TelleryBlockAtom(queryId)) as Editor.QueryBlock
      let isTemp = false
      const getReplacedQuery = (data: string, type: 'sql' | 'smart' = 'sql') => {
        const replacedData = data.replace(VARIABLE_REGEX, (name) => {
          const variableName = name.slice(2, -2)
          const variable = get(VariableAtomFamily({ storyId, name: variableName }))
          if (!variable || variable instanceof DefaultValue) return ' '
          if (variable.isDefault === false) {
            isTemp = true
          }
          if (variable.currentValue !== undefined) {
            if (variable.type === 'text') return `'${variable.currentValue}'`
            if (variable.type === 'macro') return `${variable.currentValue}`
            if (variable.type === 'number' || variable.type === 'decimal' || variable.type === 'float')
              return `${variable.currentValue}`
            if (variable.type === 'transclusion') return `{{${variable.currentValue}}}`
          }
          return name
        })
        return {
          query: {
            id: queryId,
            type: type,
            data: replacedData
          },
          isTemp: isTemp
        }
      }
      if (queryBlock.type === Editor.BlockType.SQL || queryBlock.type === Editor.BlockType.QueryBuilder) {
        return getReplacedQuery((queryBlock as Editor.SQLBlock).content?.sql ?? '')
      }
      try {
        if (queryBlock.type === Editor.BlockType.SmartQuery) {
          const smartQueryBlock = queryBlock as Editor.SmartQueryBlock
          return getReplacedQuery(
            JSON.stringify({
              queryBuilderId: smartQueryBlock.content.queryBuilderId,
              metricIds: smartQueryBlock.content?.metricIds,
              dimensions: smartQueryBlock.content?.dimensions,
              filters: smartQueryBlock.content?.filters
            }),
            'smart'
          )
        }
      } catch {
        return {
          query: {
            id: queryId,
            type: 'sql',
            data: ''
          },
          isTemp: isTemp
        }
      }
      return {
        query: {
          id: queryId,
          type: 'sql',
          data: ''
        },
        isTemp: isTemp
      }
    },
  cachePolicy_UNSTABLE: {
    eviction: 'most-recent'
  }
})
