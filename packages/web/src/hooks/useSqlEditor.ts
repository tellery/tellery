import { Monaco, useMonaco } from '@monaco-editor/react'
import { getCollectionSchema, searchBlocks } from 'api'
import { useGetBlockTitleTextSnapshot } from 'components/editor'
import { compact, padStart } from 'lodash'
import type { editor, languages } from 'monaco-editor'
import { useEffect, useMemo, useState } from 'react'
import { Editor } from 'types'
import { useGetCollectionSchema, useListCollections, useListDatabases } from './api'
import { useWorkspace } from '@app/context/workspace'

export function useSqlEditor(languageId?: string) {
  const monaco = useMonaco() || undefined
  useEffect(() => {
    if (languageId && monaco) {
      monaco.languages.register({ id: languageId })
    }
  }, [languageId, monaco])
  useSqlEditorColor(languageId, monaco)
  useSqlEditorLanguage(languageId, monaco)
  useSqlEditorTransclusion(languageId, monaco)
}

function useSqlEditorColor(languageId?: string, monaco?: Monaco) {
  useEffect(() => {
    if (!monaco || !languageId) {
      return
    }
    monaco.editor.defineTheme('tellery', {
      base: 'vs',
      inherit: true,
      rules: [
        { background: '#FFFFFF' } as unknown as editor.ITokenThemeRule,
        { token: `identifier.${languageId}`, foreground: '#333333' },
        { token: `number.${languageId}`, foreground: '#333333' },
        { token: 'keyword', foreground: '#1480BD' },
        { token: `predefined.${languageId}`, foreground: '#FF6157' },
        { token: `string.${languageId}`, foreground: '#45B16A' },
        { token: `operator.${languageId}`, foreground: '#AA5C31' },
        { token: `delimiter.parenthesis.${languageId}`, foreground: '#B4B4B4' },
        { token: `transclusion.${languageId}`, foreground: '#555555' },
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
  }, [monaco, languageId])
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
    console.log(`../lib/monarch/${languageId?.replace('/', '-')}.ts`)
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
              label: schema,
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

// const commandId = 'goto-question'
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
          const data = await searchBlocks(keyword, 100, workspace.id, Editor.BlockType.Question)
          const questionSearchResults = data ? compact(data.searchResults.map((id) => data.blocks[id])) : []
          return {
            suggestions: questionSearchResults.map((question) => ({
              range: current.range,
              label: {
                name: getBlockTitle(question),
                type: question.storyId ? getBlockTitle(data?.blocks[question.storyId]) : undefined
              },
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: `{{${question.id}}}`,
              filterText: `{{${keyword}}}`
            })),
            incomplete: true
          }
        }
        return { suggestions: [], incomplete: true }
      }
    })
    return dispose
  }, [monaco, languageId, getBlockTitle, workspace.id])
  // useEffect(() => {
  //    if (!monaco || !languageId) {
  //     return
  //   }
  //   const { dispose } = monaco.languages.registerHoverProvider(languageId, {
  //     async provideHover(model, position) {
  //       const matches = model.findMatches(transclusionRegex.source, true, true, true, null, true)
  //       const questionIds = uniq(compact(matches.map((match) => match.matches?.[1])))
  //       const questions = keyBy(
  //         await Promise.all(
  //           questionIds.map((questionId) =>
  //             fetchEntity<Editor.QuestionBlock>('block', { id: questionId }, workspace.id)
  //           )
  //         ),
  //         'id'
  //       )
  //       const current = matches.find((match) => match.range.containsPosition(position))
  //       if (current) {
  //         const questionId = current.matches?.[1]
  //         const block = questionId ? questions?.[questionId] : undefined
  //         if (!block?.content) {
  //           return { contents: [] }
  //         }
  //         return {
  //           range: current.range,
  //           contents: [
  //             {
  //               value: `### ${getBlockTitle(block)}\n\`\`\`${languageId}\n${block.content.sql || '// no sql'}\n\`\`\``
  //             }
  //           ]
  //         }
  //       }
  //       return {
  //         contents: []
  //       }
  //     }
  //   })
  //   return dispose
  // }, [monaco, languageId, getBlockTitle, workspace.id])
  // useEffect(() => {
  //    if (!monaco || !languageId) {
  //     return
  //   }
  //   const { dispose } = monaco.languages.registerCodeLensProvider(languageId, {
  //     async provideCodeLenses(model) {
  //       const matches = model.findMatches(transclusionRegex.source, true, true, true, null, true)
  //       const questionIds = uniq(compact(matches.map((match) => match.matches?.[1])))
  //       const questions = keyBy(
  //         await Promise.all(
  //           questionIds.map((questionId) =>
  //             fetchEntity<Editor.QuestionBlock>('block', { id: questionId }, workspace.id)
  //           )
  //         ),
  //         'id'
  //       )
  //       return {
  //         lenses: compact(
  //           matches.map((match, index) => {
  //             const questionId = match.matches?.[1]
  //             const block = questionId && questions?.[questionId]
  //             if (!block) {
  //               return undefined
  //             }
  //             return {
  //               id: `${questionId}${index}`,
  //               command: {
  //                 id: commandId,
  //                 title: getBlockTitle(block),
  //                 arguments: [block.storyId, questionId]
  //               },
  //               range: match.range
  //             }
  //           })
  //         ),
  //         dispose: () => {}
  //       }
  //     }
  //   })
  //   return dispose
  // }, [monaco, languageId, getBlockTitle, workspace.id])
  // useEffect(() => {
  //    if (!monaco || !languageId) {
  //     return
  //   }
  //   const { dispose } = monaco.languages.registerLinkProvider(languageId, {
  //     async provideLinks(model) {
  //       const matches = model.findMatches(transclusionRegex.source, true, true, true, null, true)
  //       const questionIds = uniq(compact(matches.map((match) => match.matches?.[1])))
  //       const questions = keyBy(
  //         await Promise.all(
  //           questionIds.map((questionId) =>
  //             fetchEntity<Editor.QuestionBlock>('block', { id: questionId }, workspace.id)
  //           )
  //         ),
  //         'id'
  //       )
  //       return {
  //         links: compact(
  //           matches.map((match) => {
  //             const questionId = match.matches?.[1]
  //             const block = (questionId ? questions?.[questionId] : undefined) as Editor.QuestionBlock | undefined
  //             if (!block) {
  //               return undefined
  //             }
  //             return {
  //               tooltip: 'Goto question',
  //               range: match.range,
  //               url: `command:${commandId}?${encodeURIComponent(JSON.stringify([block.storyId, questionId]))}`
  //             }
  //           })
  //         ),
  //         dispose: () => {}
  //       }
  //     }
  //   })
  //   return dispose
  // }, [monaco, languageId, workspace.id])
  // const openStoryHandler = useOpenStory()
  // const { open } = useQuestionEditor()
  // useEffect(() => {
  //    if (!monaco || !languageId) {
  //     return
  //   }
  //   const { dispose } = monaco.editor.registerCommand(commandId, (_accessor, ...args) => {
  //     openStoryHandler(args[0], { blockId: args[1], isAltKeyPressed: true })
  //     open({ mode: 'SQL', storyId: args[0], blockId: args[1], readonly: false })
  //   })
  //   return dispose
  // }, [monaco, open, openStoryHandler])
}
