import { compact } from 'lodash'
import type { editor } from 'monaco-editor'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWorkspace } from './useWorkspace'
import { createPortal } from 'react-dom'
import { css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'
import { VARIABLE_REGEX } from '@app/utils'
import { useRecoilValue } from 'recoil'
import { StoryVariables } from '@app/components/editor/store/variables'
import { useOpenStory } from './index'
import { SVG2DataURI } from '@app/lib/svg'
import { IconMenuCode } from '@app/assets/icons'
import { useMonaco } from '@monaco-editor/react'

export default function useSqlEditorVariable(props: {
  storyId: string
  blockId: string
  languageId?: string
  editor?: editor.IStandaloneCodeEditor
}) {
  useSqlEditorVariableAutoCompletion(props.storyId, props.languageId)
  const { editor } = props
  const workspace = useWorkspace()
  const [matches, setMatches] = useState<editor.FindMatch[]>([])
  const variables = useRecoilValue(StoryVariables(props.storyId))
  const mapMatchToContentWidget = useCallback(
    (match: editor.FindMatch, index: number) => {
      const variableName = match.matches?.[1]
      if (!variableName || !variables[variableName]) {
        return null
      }
      return {
        getId: () => {
          return `content.widget.variable.${props.blockId}.${variableName}.${index}`
        },
        getDomNode: () => {
          return document.createElement('div')
        },
        getPosition: () => {
          return {
            position: match.range.getStartPosition(),
            range: match.range,
            preference: [0]
          }
        }
      }
    },
    [props.blockId, variables]
  )
  const contentWidgets = useMemo<editor.IContentWidget[]>(
    () => compact(matches.map(mapMatchToContentWidget)),
    [mapMatchToContentWidget, matches]
  )
  useEffect(() => {
    if (!editor) {
      return
    }
    const model = editor.getModel()
    if (!model) {
      return
    }
    setMatches(model.findMatches(VARIABLE_REGEX.source, true, true, true, null, true))
    const { dispose } = model.onDidChangeContent(() => {
      setMatches(model.findMatches(VARIABLE_REGEX.source, true, true, true, null, true))
    })
    return dispose
  }, [editor, workspace.id])
  useEffect(() => {
    if (!editor) {
      return
    }
    contentWidgets.forEach((contentWidget) => {
      editor.addContentWidget(contentWidget)
    })
    return () => {
      contentWidgets.forEach((contentWidget) => {
        editor.removeContentWidget(contentWidget)
      })
    }
  }, [editor, contentWidgets])
  useEffect(() => {
    if (!editor) {
      return
    }
    const { dispose } = editor.onDidChangeCursorPosition((e) => {
      const match = matches.find(({ range }) => range.containsPosition(e.position))
      const variableName = match?.matches?.[1]
      if (!variableName || !variables[variableName]) {
        return
      }
      if (
        match.range.getStartPosition().isBefore(e.position) &&
        (e.position.isBefore(match.range.getEndPosition()) ||
          (e.source === 'deleteLeft' && e.position.isBeforeOrEqual(match.range.getEndPosition())))
      ) {
        editor.setSelection(match.range)
      }
    })
    return dispose
  }, [editor, contentWidgets, matches, variables])
  const widgets = useMemo(
    () =>
      matches.map((match, index) => {
        const variableName = match?.matches?.[1]
        if (!variableName || !variables[variableName]) {
          return null
        }
        return (
          <VariableContentWidget
            storyId={props.storyId}
            key={variableName}
            blockId={props.blockId}
            name={variableName}
            value={variables[variableName]}
            length={match.matches[0].length}
            index={index}
          />
        )
      }),
    [matches, props.blockId, props.storyId, variables]
  )
  return widgets
}

function VariableContentWidget(props: {
  storyId: string
  blockId: string
  name: string
  value: { blockId: string }
  length: number
  index: number
}) {
  const { name, value } = props
  const openStoryHandler = useOpenStory()
  const [el, setEl] = useState<Element | null>()
  useEffect(() => {
    const timer = setInterval(() => {
      const e = document.querySelector(`[widgetid="content.widget.variable.${props.blockId}.${name}.${props.index}"]`)
      if (e) {
        setEl(e)
        clearInterval(timer)
      }
    }, 100)
    return () => {
      clearInterval(timer)
    }
  }, [name, props.blockId, props.index])

  return el
    ? createPortal(
        <div
          className={css`
            font-size: 12px;
            line-height: 18px;
            vertical-align: middle;
            border-radius: 6px;
            padding: 0 5px 0 23px;
            color: ${ThemingVariables.colors.text[0]};
            background-color: ${ThemingVariables.colors.primary[4]};
            background-image: ${SVG2DataURI(IconMenuCode)};
            background-size: 16px;
            background-repeat: no-repeat;
            background-position: 5px 50%;
            white-space: nowrap;
            cursor: pointer;
            overflow: hidden;
            text-overflow: ellipsis;
            width: ${props.length * 0.955}ch;
          `}
          onClick={() => {
            openStoryHandler(props.storyId, { blockId: value.blockId })
          }}
        >
          {props.name}
        </div>,
        el
      )
    : null
}

function useSqlEditorVariableAutoCompletion(storyId: string, languageId?: string) {
  const monaco = useMonaco()
  const variables = useRecoilValue(StoryVariables(storyId))
  const workspace = useWorkspace()

  useEffect(() => {
    if (!monaco || !languageId) {
      return
    }
    const { dispose } = monaco.languages.registerCompletionItemProvider(languageId, {
      triggerCharacters: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ' ', '-'],
      provideCompletionItems(model, position) {
        const matches = model.findMatches(VARIABLE_REGEX.source, true, true, true, null, true)
        const current = matches.find((match) => match.range.containsPosition(position))
        if (current) {
          const keyword = current.matches?.[1] || ''
          return {
            suggestions: Object.keys(variables).map((name, index) => ({
              range: current.range,
              label: name,
              detail: String(variables[name]?.currentRawValue || ''),
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: `{{${name}}}`,
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
  }, [monaco, languageId, workspace.id, variables])
}
