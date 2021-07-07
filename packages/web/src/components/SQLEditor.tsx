import { IconMenuQuery } from '@app/assets/icons'
import { useWorkspace } from '@app/context/workspace'
import { useOpenStory } from '@app/hooks'
import { useMgetBlocks } from '@app/hooks/api'
import { transclusionRegex } from '@app/hooks/useSqlEditor'
import { SVG2DataURI } from '@app/lib/svg'
import { ThemingVariables } from '@app/styles'
import type { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import MonacoEditor, { useMonaco } from '@monaco-editor/react'
import { compact, uniq } from 'lodash'
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGetBlockTitleTextSnapshot } from './editor'
import { useQuestionEditor } from './StoryQuestionsEditor'

const contentWidgetClassname = css`
  font-size: 12px;
  line-height: 18px;
  vertical-align: middle;
  border-radius: 6px;
  padding: 0 5px 0 23px;
  color: ${ThemingVariables.colors.text[0]};
  background-color: ${ThemingVariables.colors.primary[4]};
  background-image: ${SVG2DataURI(IconMenuQuery)};
  background-size: 16px;
  background-repeat: no-repeat;
  background-position: 5px 50%;
  white-space: nowrap;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
`

const STORY_BLOCK_REGEX = new RegExp(`${window.location.protocol}//${window.location.host}/story/(\\S+)#(\\S+)`)

const trasnformPasteText = (text: string) => {
  if (STORY_BLOCK_REGEX.test(text)) {
    const matches = STORY_BLOCK_REGEX.exec(text)!
    return `{{${matches[2]}}}`
  }
}

export function SQLEditor(props: {
  languageId: string
  value: string
  onChange(value: string): void
  padding?: {
    top: number
    bottom: number
  }
  className?: string
  onSave?(): void
  onRun?(): void
}) {
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>()
  const { onRun, onSave } = props
  const monaco = useMonaco()
  useEffect(() => {
    if (!editor || !monaco) {
      return
    }

    editor.onDidPaste((e) => {
      const pastedString = editor.getModel()?.getValueInRange(e.range)
      if (!pastedString) return

      const transformedText = trasnformPasteText(pastedString)
      if (transformedText) {
        editor.setSelection(e.range)
        const id = { major: 1, minor: 1 }
        const text = transformedText
        const op = { identifier: id, range: e.range, text: text, forceMoveMarkers: true }
        editor.executeEdits('transform-pasted-text', [op])
      }
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => onSave?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.())
  }, [editor, monaco, onRun, onSave])
  const { onChange } = props
  const handleChange = useCallback(
    (value: string | undefined) => {
      onChange(value || '')
    },
    [onChange]
  )
  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      folding: true,
      wordWrap: 'on',
      contextmenu: false,
      scrollbar: { verticalScrollbarSize: 0, horizontalSliderSize: 0 },
      minimap: { enabled: false },
      glyphMargin: false,
      padding: props.padding,
      lineHeight: 18,
      fontSize: 12
    }),
    [props.padding]
  )
  const workspace = useWorkspace()
  const [matches, setMatches] = useState<editor.FindMatch[]>([])
  useEffect(() => {
    if (!editor) {
      return
    }
    const model = editor.getModel()
    if (!model) {
      return
    }
    setMatches(model.findMatches(transclusionRegex.source, true, true, true, null, true))
    const { dispose } = model.onDidChangeContent(() => {
      setMatches(model.findMatches(transclusionRegex.source, true, true, true, null, true))
    })
    return dispose
  }, [editor, workspace.id])
  const questionIds = useMemo(() => uniq(compact(matches.map((match) => match.matches?.[1]))), [matches])
  const { data: questions } = useMgetBlocks(questionIds)
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const openStoryHandler = useOpenStory()
  const { open } = useQuestionEditor()
  const contentWidgets = useMemo<editor.IContentWidget[]>(
    () =>
      compact(
        matches.map((match, index) => {
          const questionId = match.matches?.[1]
          const block = (questionId ? questions?.[questionId] : undefined) as Editor.QuestionBlock | undefined
          if (!block) {
            return undefined
          }
          return {
            getId: () => {
              return `content.widget.transclusion.${questionId}.${index}`
            },
            getDomNode: () => {
              const domNode = document.createElement('div')
              domNode.innerHTML = getBlockTitle(block)
              domNode.className = contentWidgetClassname
              if (match.matches?.[0]) {
                domNode.style.width = `${match.matches[0].length * 0.955}ch`
              }
              domNode.title = `${getBlockTitle(block)}\n${block.content?.sql || ''}`
              domNode.onclick = () => {
                if (!block.storyId) {
                  return
                }
                openStoryHandler(block.storyId, { blockId: block.id, isAltKeyPressed: true })
                open({ mode: 'SQL', storyId: block.storyId, blockId: block.id, readonly: false })
              }
              return domNode
            },
            getPosition: () => {
              return {
                position: match.range.getStartPosition(),
                range: match.range,
                preference: [0]
              }
            }
          }
        })
      ),
    [getBlockTitle, matches, open, openStoryHandler, questions]
  )
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

  return (
    <MonacoEditor
      className={cx(
        css`
          .scroll-decoration {
            display: none;
          }
          .detected-link {
            text-decoration: unset !important;
          }
        `
      )}
      wrapperClassName={props.className}
      theme="tellery"
      value={props.value}
      onChange={handleChange}
      height="100%"
      width="100%"
      language={props.languageId}
      options={options}
      onMount={setEditor}
    />
  )
}
