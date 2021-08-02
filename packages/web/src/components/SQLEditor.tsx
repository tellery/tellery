import { IconCommonQuestion } from '@app/assets/icons'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { useOpenStory } from '@app/hooks'
import { useMgetBlocks } from '@app/hooks/api'
import { transclusionRegex } from '@app/hooks/useSqlEditor'
import { SVG2DataURI } from '@app/lib/svg'
import { ThemingVariables } from '@app/styles'
import type { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import MonacoEditor, { useMonaco } from '@monaco-editor/react'
import Tippy from '@tippyjs/react'
import { compact, uniq } from 'lodash'
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGetBlockTitleTextSnapshot } from './editor'
import { useQuestionEditor } from './StoryQuestionsEditor'
import { SQLViewer } from './SQLViewer'

const STORY_BLOCK_REGEX = new RegExp(`${window.location.protocol}//${window.location.host}/story/(\\S+)#(\\S+)`)

const trasnformPasteText = (text: string) => {
  if (STORY_BLOCK_REGEX.test(text)) {
    const matches = STORY_BLOCK_REGEX.exec(text)!
    return `{{${matches[2]}}}`
  }
}

export function SQLEditor(props: {
  blockId: string
  languageId?: string
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
  const questionIds = useMemo(() => uniq(compact(matches.map((match) => match.matches?.[1]))), [matches])
  const { data: questions } = useMgetBlocks(questionIds)
  const mapMatchToContentWidget = useCallback(
    (match: editor.FindMatch, index: number) => {
      const questionId = match.matches?.[1]
      if (!questionId) {
        return null
      }
      return {
        getId: () => {
          return `content.widget.transclusion.${props.blockId}.${questionId}.${index}`
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
    [props.blockId]
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
    setMatches(model.findMatches(transclusionRegex.source, true, true, true, null, true))
    const { dispose } = model.onDidChangeContent(() => {
      setMatches(model.findMatches(transclusionRegex.source, true, true, true, null, true))
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
      if (!match?.matches?.[0]) {
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
  }, [editor, contentWidgets, matches])
  const widgets = useMemo(
    () =>
      matches.map((match, index) => {
        if (!match.matches) {
          return null
        }
        const questionId = match.matches[1]
        return questions?.[questionId] ? (
          <TransclusionContentWidget
            key={questionId}
            blockId={props.blockId}
            value={questions[questionId]}
            languageId={props.languageId}
            length={match.matches[0].length}
            index={index}
          />
        ) : null
      }),
    [matches, props.blockId, props.languageId, questions]
  )

  return (
    <>
      {widgets}
      <MonacoEditor
        className={cx(
          css`
            .scroll-decoration {
              display: none;
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
    </>
  )
}

function TransclusionContentWidget(props: {
  blockId: string
  languageId?: string
  value: Editor.QuestionBlock
  length: number
  index: number
}) {
  const { value: block } = props
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const openStoryHandler = useOpenStory()
  const { open } = useQuestionEditor()
  const el = document.querySelector(
    `[widgetid="content.widget.transclusion.${props.blockId}.${block.id}.${props.index}"]`
  )
  const title = getBlockTitle(block)
  const [visible, setVisible] = useState(false)

  return el
    ? createPortal(
        <Tippy
          visible={visible}
          theme="tellery"
          duration={150}
          content={
            <div
              className={css`
                pointer-events: all;
                width: 600px;
                box-shadow: ${ThemingVariables.boxShadows[0]};
                border-radius: 8px;
                display: flex;
                flex-direction: column;
                background: ${ThemingVariables.colors.gray[5]};
              `}
            >
              <h4
                className={css`
                  flex-shrink: 0;
                  font-weight: 600;
                  font-size: 16px;
                  line-height: 22px;
                  margin: 20px 15px 0 15px;
                  color: ${ThemingVariables.colors.text[0]};
                `}
              >
                {title}
              </h4>
              {block.content?.sql && props.languageId && visible ? (
                <div
                  className={css`
                    height: 300px;
                  `}
                >
                  <SQLViewer
                    blockId={block.id}
                    languageId={props.languageId}
                    value={block.content?.sql}
                    padding={{ top: 10, bottom: 10 }}
                    className={css`
                      padding: 0 15px;
                    `}
                  />
                </div>
              ) : null}
              <div
                className={css`
                  border-top: 1px solid ${ThemingVariables.colors.gray[1]};
                  height: 44px;
                  flex-shrink: 0;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 14px 0;
                  margin: 0 15px;
                  span {
                    font-size: 14px;
                    line-height: 16px;
                    color: ${ThemingVariables.colors.text[1]};
                  }
                `}
              >
                <span
                  className={css`
                    cursor: pointer;
                  `}
                  onClick={() => {
                    if (!block.storyId) {
                      return
                    }
                    openStoryHandler(block.storyId, { blockId: block.id, isAltKeyPressed: true })
                    open({ mode: 'SQL', storyId: block.storyId, blockId: block.id, readonly: false })
                  }}
                >
                  Go to question
                </span>
                <span>⌘+click</span>
              </div>
            </div>
          }
          onClickOutside={() => {
            setVisible(false)
          }}
          arrow={false}
        >
          <div
            className={css`
              font-size: 12px;
              line-height: 18px;
              vertical-align: middle;
              border-radius: 6px;
              padding: 0 5px 0 23px;
              color: ${ThemingVariables.colors.text[0]};
              background-color: ${ThemingVariables.colors.primary[4]};
              background-image: ${SVG2DataURI(IconCommonQuestion)};
              background-size: 16px;
              background-repeat: no-repeat;
              background-position: 5px 50%;
              white-space: nowrap;
              cursor: pointer;
              overflow: hidden;
              text-overflow: ellipsis;
              width: ${props.length * 0.955}ch;
            `}
            onClick={(e) => {
              if (!block.storyId || !e.metaKey) {
                setVisible((old) => !old)
                return
              }
              openStoryHandler(block.storyId, { blockId: block.id, isAltKeyPressed: true })
              open({ mode: 'SQL', storyId: block.storyId, blockId: block.id, readonly: false })
            }}
          >
            {title}
          </div>
        </Tippy>,
        el
      )
    : null
}
