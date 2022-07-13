import { TelleryBlockAtom } from '@app/store/block'
import { Editor } from '@app/types'
import { DefaultValue, selectorFamily } from 'recoil'
import { TelleryVariable, VariableAtomFamily } from './variables'
import * as mustacheParser from '@tellery/mustache-parser'
const mustachePattern = /{{\s*(.+?)\s*}}/g

const getVariableLiteral = (variable: TelleryVariable) => {
  if (variable.type === 'text') return `'${variable.currentValue}'`
  if (variable.type === 'macro') return `${variable.currentValue}`
  if (variable.type === 'number' || variable.type === 'decimal' || variable.type === 'float')
    return `${variable.currentValue}`
  if (variable.type === 'transclusion') return `{{${variable.currentValue}}}`
  return '""'
}

const buildExpressionLiteral = (expression: { name: string; params: Record<string, string>; alias?: string }) => {
  const paramsKeys = Object.keys(expression.params)
  const paramsText =
    Object.keys(paramsKeys).length === 0
      ? ''
      : `(${paramsKeys.map((key) => `${key}=${expression.params[key]}`).join(',')})`

  return `{{${expression.name}${paramsText}${expression.alias ? `as ${expression.alias}` : ''}}}`
}

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
        const replacedData = data.replace(mustachePattern, (match) => {
          const expressionText = match.slice(2, -2)
          let expression: null | {
            name: string
            params: Record<string, string>
            alias?: string
          } = null
          try {
            expression = mustacheParser.parse(expressionText, {})
          } catch (err) {
            console.error(data, match, err)
          }
          if (expression === null) return match
          if (expression.name.length === 21) {
            // is transculsion
            const filledParams: Record<string, string> = {}
            for (let variableName in expression.params) {
              const value = expression.params[variableName]
              if (value.startsWith('"')) {
                // is literal
                filledParams[variableName] = value
              } else {
                let variable = get(VariableAtomFamily({ storyId, name: value }))
                if (!variable || variable instanceof DefaultValue) {
                  continue
                }
                if (variable.isDefault === false) {
                  isTemp = true
                }
                filledParams[variableName] = `"${getVariableLiteral(variable)}"`
              }
            }
            return buildExpressionLiteral({
              ...expression,
              params: filledParams
            })
          } else {
            const variableName = expression.name
            const variable = get(VariableAtomFamily({ storyId, name: variableName }))
            if (!variable || variable instanceof DefaultValue) return ' '
            if (variable.isDefault === false) {
              isTemp = true
            }
            if (variable.currentValue !== undefined) {
              return getVariableLiteral(variable)
            }
          }
          return match
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
