import { useGetBlock } from '@app/hooks/api'
import useSqlEditorTransclusion from '@app/hooks/useSqlEditorTransclusion'
import useSqlEditorVariable from '@app/hooks/useSqlEditorVariable'
import { ThemingVariables } from '@app/styles'
import { trasnformPasteBlockLinkToTransclusion } from '@app/utils'
import { css, cx } from '@emotion/css'
import MonacoEditor, { useMonaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api'
import { useCallback, useEffect, useMemo, useState } from 'react'
import invariant from 'tiny-invariant'
import { CircularLoading } from './CircularLoading'

export function SQLEditor(props: {
  blockId: string
  isActive?: boolean
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
  onSave?: {
    readonly current: (snapshotId?: string | undefined) => void
  }
  onRun?: {
    readonly current: () => Promise<void>
  }
}) {
  const { onRun, onSave } = props
  const monaco = useMonaco()
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>()

  const getBlock = useGetBlock()

  useEffect(() => {
    editor?.focus()
  }, [editor])

  useEffect(() => {
    // TODO: a monaco editor bug, see: https://github.com/microsoft/monaco-editor/issues/2947
    if (!editor || !monaco || !props.isActive) {
      return
    }
    invariant(editor, 'editor is null')
    const unsubscribe = editor.onDidPaste((e) => {
      const pastedString = editor!.getModel()?.getValueInRange(e.range)
      if (!pastedString) return

      trasnformPasteBlockLinkToTransclusion(pastedString, getBlock).then((transformedText) => {
        if (transformedText) {
          editor!.setSelection(e.range)
          const id = { major: 1, minor: 1 }
          const text = `{{${transformedText}}}`
          const op = { identifier: id, range: e.range, text: text, forceMoveMarkers: true }
          editor!.executeEdits('transform-pasted-text', [op])
        }
      })
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSave?.current())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRun?.current())
    return () => {
      unsubscribe.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, getBlock, monaco, onRun, onSave, props.isActive])

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
    editor: editor
  })
  const variableWidgets = useSqlEditorVariable({
    storyId: props.storyId,
    blockId: props.blockId,
    languageId: props.languageId,
    editor: editor
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
        path={props.blockId}
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
