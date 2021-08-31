import { Monaco, useMonaco } from '@monaco-editor/react'
import { getCollectionSchema, referenceCompletion } from '@app/api'
import { useGetBlockTitleTextSnapshot } from '@app/components/editor'
import { compact, padStart } from 'lodash'
import type { editor, languages } from 'monaco-editor'
import { useEffect, useMemo, useState } from 'react'
import { useGetCollectionSchema, useListCollections, useListDatabases } from './api'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { Editor } from '@app/types'

export function useSqlEditor(languageId?: string) {
  const monaco = useMonaco() ?? undefined
  useEffect(() => {
    if (languageId && monaco) {
      monaco.languages.register({ id: languageId })
    }
  }, [languageId, monaco])
  useSqlEditorColor(monaco)
  useSqlEditorLanguage(languageId, monaco)
  useSqlEditorTransclusion(languageId, monaco)
}

function useSqlEditorColor(monaco?: Monaco) {
  useEffect(() => {
    if (!monaco) {
      return
    }
    monaco.editor.defineTheme('tellery', {
      base: 'vs',
      inherit: true,
      rules: [
        { background: '#FFFFFF' } as unknown as editor.ITokenThemeRule,
        { token: 'identifier', foreground: '#333333' },
        { token: 'number', foreground: '#333333' },
        { token: 'keyword', foreground: '#1480BD' },
        { token: 'predefined', foreground: '#FF6157' },
        { token: 'string', foreground: '#45B16A' },
        { token: 'operator', foreground: '#AA5C31' },
        { token: 'delimiter.parenthesis', foreground: '#B4B4B4' },
        { token: 'transclusion', foreground: '#555555' },
        { token: 'comment', foreground: '#B4B4B4' }
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editorLineNumber.foreground': '#CCCCCC',
        'editorLineNumber.activeForeground': '#999999',
        'textLink.foreground': '#002FA7',
        'textLink.activeForeground': '#002FA7',
        'editorLink.activeForeground': '#002FA7'
      }
    })
  }, [monaco])
}

function useSqlEditorLanguage(languageId?: string, monaco?: Monaco) {
  const { data: databases = [] } = useListDatabases()
  const [database, setDatabase] = useState<string>()
  const { data: collections = [] } = useListCollections(database)
  const [collection, setCollection] = useState<string>()
  const { data: schemas = [] } = useGetCollectionSchema(database, collection)
  const workspace = useWorkspace()
  const [monarch, setMonarch] = useState<
    languages.IMonarchLanguage & {
      keywords: string[]
      operators: string[]
      builtinFunctions: string[]
      builtinVariables: string[]
      pseudoColumns: string[]
    }
  >()
  useEffect(() => {
    // see: https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
    if (!languageId) return
    import(`../lib/monarch/${languageId?.replace('/', '-')}.ts`)
      .then(({ default: _monarch }) => {
        setMonarch(_monarch)
      })
      .catch((err) => {
        console.error(err)
        setMonarch(undefined)
      })
  }, [languageId])
  useEffect(() => {
    if (!monaco || !languageId || typeof monarch !== 'object') {
      return
    }
    const { dispose } = monaco.languages.setMonarchTokensProvider(languageId, monarch as languages.IMonarchLanguage)
    return dispose
  }, [monaco, languageId, monarch])
  useEffect(() => {
    if (!monaco || !languageId) {
      return
    }
    const { dispose } = monaco.languages.setLanguageConfiguration(languageId, {
      comments: {
        lineComment: '--',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' }
      ]
    })
    return dispose
  }, [monaco, languageId])
  const builtinSuggestions = useMemo<Omit<languages.CompletionItem, 'range'>[]>(
    () =>
      monaco && monarch
        ? [
            ...monarch.keywords.map((keyword) => ({
              label: keyword.toUpperCase(),
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword.toUpperCase()
            })),
            ...monarch.keywords.map((keyword) => ({
              label: keyword.toLowerCase(),
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword.toLowerCase()
            })),
            ...monarch.operators.map((operator) => ({
              label: operator,
              kind: monaco.languages.CompletionItemKind.Operator,
              insertText: operator
            })),
            ...monarch.builtinFunctions.map((builtinFunction) => ({
              label: builtinFunction,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: builtinFunction
            })),
            ...monarch.builtinVariables.map((builtinVariable) => ({
              label: builtinVariable,
              kind: monaco.languages.CompletionItemKind.Constant,
              insertText: builtinVariable
            })),
            ...monarch.pseudoColumns.map((pseudoColumn) => ({
              label: pseudoColumn,
              kind: monaco.languages.CompletionItemKind.Struct,
              insertText: pseudoColumn
            }))
          ]
        : [],
    [monaco, monarch]
  )
  useEffect(() => {
    if (!monaco || !languageId) {
      return
    }
    const { dispose } = monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: ['.'],
      provideCompletionItems(model, position) {
        const matches = model.findMatches(incompleteTransclusionRegex.source, true, true, true, null, true)
        const current = matches.find((match) => match.range.containsPosition(position))
        if (current) {
          return { suggestions: [], incomplete: true }
        }
        const textUntilPosition = model
          .getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          })
          .split('\n')
          .join(' ')
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }
        const matchDatabaseCollection = textUntilPosition.match(/SELECT.*\sFROM\s(\w+)\.(\w+)/i)
        if (
          matchDatabaseCollection?.[1] &&
          databases.includes(matchDatabaseCollection?.[1]) &&
          matchDatabaseCollection?.[2] &&
          collections.includes(matchDatabaseCollection?.[2])
        ) {
          setDatabase(matchDatabaseCollection?.[1])
          setCollection(matchDatabaseCollection?.[2])
        }
        const matchCollection = textUntilPosition.match(/SELECT.*\sFROM\s(\w+)\.\w*$/i)
        if (matchCollection?.[1] && databases.includes(matchCollection?.[1])) {
          setDatabase(matchCollection?.[1])
        }
        return {
          suggestions: [
            ...databases.map((database) => ({
              label: database,
              kind: monaco.languages.CompletionItemKind.Method,
              insertText: database,
              range
            })),
            ...collections.map((collection) => ({
              label: collection,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: collection,
              range
            })),
            ...schemas.map((schema, index) => ({
              label: schema.name,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: schema.name.startsWith('$') ? `\`${schema.name}\`` : schema.name,
              sortText: padStart(index.toString(), 5, '0'),
              range
            })),
            ...builtinSuggestions.map((suggestion) => ({
              ...suggestion,
              range
            }))
          ],
          incomplete: true
        }
      }
    })
    return dispose
  }, [collections, databases, schemas, monaco, builtinSuggestions, languageId])
  useEffect(() => {
    if (!monaco || !languageId) {
      return
    }
    const { dispose } = monaco.languages.registerHoverProvider(languageId, {
      async provideHover(model, position) {
        const matches = model.findMatches(
          /(FROM|JOIN｜UNION) +([A-Za-z_\w@#$]+)\.([A-Za-z_\w@#$]+)/.source,
          true,
          true,
          false,
          null,
          true
        )
        const current = matches.find((match) => match.range.containsPosition(position))
        if (current?.matches) {
          const [, , database, collection] = current.matches
          const schemas = await getCollectionSchema({
            database,
            collection,
            connectorId: workspace.preferences.connectorId!,
            profile: workspace.preferences.profile!,
            workspaceId: workspace.id
          })
          return {
            range: current.range,
            contents: [
              { value: `**${database}.${collection}**` },
              {
                value: [
                  '|name|type|',
                  '|:---|:---|',
                  ...schemas.map((schema) => `|${schema.name}|${schema.sqlType}|`)
                ].join('\n')
              }
            ]
          }
        }
        return {
          contents: []
        }
      }
    })
    return dispose
  }, [monaco, languageId, workspace])
}

export const transclusionRegex = /\{\{ *([0-9a-zA-Z\-_]{21}) *(as *\w+)? *\}\}/
const incompleteTransclusionRegex = /\{\{([^{}]+)\}\}/

/**
 * @see https://github.com/microsoft/monaco-editor/issues/1857
 * @see https://github.com/microsoft/monaco-editor/issues/1704
 */
function useSqlEditorTransclusion(languageId?: string, monaco?: Monaco) {
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const workspace = useWorkspace()

  useEffect(() => {
    if (!monaco || !languageId) {
      return
    }
    const { dispose } = monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ' ', '-'],
      async provideCompletionItems(model, position) {
        const matches = model.findMatches(incompleteTransclusionRegex.source, true, true, true, null, true)
        const current = matches.find((match) => match.range.containsPosition(position))
        if (current) {
          const keyword = current.matches?.[1] || ''
          const data = await referenceCompletion(workspace.id, keyword, 100)
          const searchResults = data ? compact(data.searchResults.map((id) => data.blocks[id])) : []
          return {
            suggestions: searchResults.map((result, index) => ({
              range: current.range,
              label: getBlockTitle(result) || '',
              detail:
                result.storyId && data?.blocks[result.storyId]
                  ? getBlockTitle(data?.blocks[result.storyId])
                  : undefined,
              kind:
                result.type === Editor.BlockType.QueryBuilder
                  ? monaco.languages.CompletionItemKind.Class
                  : monaco.languages.CompletionItemKind.Function,
              insertText: `{{${result.id}}}`,
              filterText: `{{${keyword}}}`,
              sortText: index.toString().padStart(4, '0')
            })),
            incomplete: true
          }
        }
        return { suggestions: [], incomplete: true }
      }
    })
    return dispose
  }, [monaco, languageId, getBlockTitle, workspace.id])
}
