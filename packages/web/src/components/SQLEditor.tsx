import { useFetchBlock } from '@app/hooks/useFetchBlock'
import useSqlEditorTransclusion from '@app/hooks/useSqlEditorTransclusion'
import useSqlEditorVariable from '@app/hooks/useSqlEditorVariable'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { parseTelleryUrl } from '@app/utils'
import { css, cx } from '@emotion/css'
import MonacoEditor, { useMonaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircularLoading } from './CircularLoading'

const trasnformPasteText = async (text: string, getBlock: (blockId: string) => Promise<Editor.BaseBlock>) => {
  const parsedUrlParams = parseTelleryUrl(text)
  if (parsedUrlParams) {
    const blockId = parsedUrlParams.blockId
    const block = await getBlock(blockId)
    if (block.type === Editor.BlockType.Visualization) {
      if ((block as Editor.VisualizationBlock).content?.queryId)
        return `{{${(block as Editor.VisualizationBlock).content?.queryId}}}`
    }
    return `{{${block.id}}}`
  }
}

export function SQLEditor(props: {
  blockId: string
  languageId?: string
  storyId: string
  value: string
  readOnly?: boolean
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

  const fetchBlock = useFetchBlock()

  useEffect(() => {
    editor?.focus()
  }, [editor])

  useEffect(() => {
    if (!editor || !monaco) {
      return
    }
    const unsubscribe = editor.onDidPaste((e) => {
      const pastedString = editor.getModel()?.getValueInRange(e.range)
      if (!pastedString) return

      trasnformPasteText(pastedString, fetchBlock).then((transformedText) => {
        if (transformedText) {
          editor.setSelection(e.range)
          const id = { major: 1, minor: 1 }
          const text = transformedText
          const op = { identifier: id, range: e.range, text: text, forceMoveMarkers: true }
          editor.executeEdits('transform-pasted-text', [op])
        }
      })
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => onSave?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.())
    return () => {
      unsubscribe.dispose()
    }
  }, [editor, fetchBlock, monaco, onRun, onSave])

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
      readOnly: props.readOnly,
      contextmenu: false,
      scrollbar: { verticalScrollbarSize: 0, horizontalSliderSize: 0 },
      minimap: { enabled: false },
      glyphMargin: false,
      padding: props.padding,
      lineHeight: 18,
      fontSize: 12
    }),
    [props.padding, props.readOnly]
  )
  const transclusionWidgets = useSqlEditorTransclusion({
    storyId: props.storyId,
    blockId: props.blockId,
    languageId: props.languageId,
    editor
  })
  const variableWidgets = useSqlEditorVariable({
    storyId: props.storyId,
    blockId: props.blockId,
    languageId: props.languageId,
    editor
  })

  return (
    <>
      {transclusionWidgets}
      {variableWidgets}
      <MonacoEditor
        className={cx(
          css`
            .scroll-decoration {
              display: none;
            }
            .suggest-widget .monaco-list-row .highlight {
              color: unset !important;
              font-weight: unset !important;
            }
          `
        )}
        wrapperProps={{
          className: props.className
        }}
        theme="tellery"
        value={props.value}
        onChange={handleChange}
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
