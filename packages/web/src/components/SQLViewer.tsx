import { IconCommonDbt, IconCommonSql } from '@app/assets/icons'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { useMgetBlocks } from '@app/hooks/api'
import { transclusionRegex } from '@app/hooks/useSqlEditor'
import { SVG2DataURI } from '@app/lib/svg'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import MonacoEditor from '@monaco-editor/react'
import { compact, uniq } from 'lodash'
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useGetBlockTitleTextSnapshot } from './editor'
import { CircularLoading } from './CircularLoading'

export function SQLViewer(props: {
  blockId: string
  languageId: string
  value: string
  padding?: {
    top: number
    bottom: number
  }
  className?: string
}) {
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>()
  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      folding: false,
      wordWrap: 'on',
      contextmenu: false,
      scrollbar: { verticalScrollbarSize: 0, horizontalSliderSize: 0 },
      minimap: { enabled: false },
      lineNumbers: 'off',
      renderLineHighlight: 'none',
      glyphMargin: false,
      lineNumbersMinChars: 0,
      lineDecorationsWidth: 0,
      padding: props.padding,
      lineHeight: 18,
      fontSize: 12,
      readOnly: true,
      scrollBeyondLastLine: false,
      scrollBeyondLastColumn: 0
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
          return `content.widget.transclusion.view.${props.blockId}.${questionId}.${index}`
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
            length={match.matches[0].length}
            index={index}
          />
        ) : null
      }),
    [matches, props.blockId, questions]
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
        height="100%"
        width="100%"
        language={props.languageId}
        options={options}
        onMount={setEditor}
        loading={<CircularLoading size={50} color={ThemingVariables.colors.gray[0]} />}
      />
    </>
  )
}

function TransclusionContentWidget(props: { blockId: string; value: Editor.SQLBlock; length: number; index: number }) {
  const { value: block } = props
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const el = document.querySelector(
    `[widgetid="content.widget.transclusion.view.${props.blockId}.${block.id}.${props.index}"]`
  )
  const title = getBlockTitle(block)
  const isDBT = block.type === Editor.BlockType.DBT

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
            background-image: ${SVG2DataURI(isDBT ? IconCommonDbt : IconCommonSql)};
            background-size: 16px;
            background-repeat: no-repeat;
            background-position: 5px 50%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: ${props.length * 0.955}ch;
          `}
        >
          {title}
        </div>,
        el
      )
    : null
}
