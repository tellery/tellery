import { compact } from 'lodash'
import type { editor } from 'monaco-editor'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useWorkspace } from './useWorkspace'
import { createPortal } from 'react-dom'
import Tippy from '@tippyjs/react'
import { css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'
import { VARIABLE_REGEX } from '@app/utils'
import { useRecoilValue } from 'recoil'
import { StoryVariables } from '@app/components/editor/store/variables'
import { useOpenStory } from './index'

export default function useSqlEditorVariable(props: {
  storyId: string
  blockId: string
  languageId?: string
  editor?: editor.IStandaloneCodeEditor
}) {
  const { editor } = props
  const workspace = useWorkspace()
  const [matches, setMatches] = useState<editor.FindMatch[]>([])
  const variables = useRecoilValue(StoryVariables(props.storyId))
  const mapMatchToContentWidget = useCallback(
    (match: editor.FindMatch, index: number) => {
      const variableName = match.matches?.[1]
      if (!variableName) {
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
        const variableName = match.matches[1]
        return (
          <VariableContentWidget
            storyId={props.storyId}
            key={variableName}
            blockId={props.blockId}
            name={variableName}
            value={variables[variableName]}
            languageId={props.languageId}
            length={match.matches[0].length}
            index={index}
          />
        )
      }),
    [matches, props.blockId, props.languageId, props.storyId, variables]
  )
  return widgets
}

function VariableContentWidget(props: {
  blockId: string
  languageId?: string
  name: string
  value: { blockId: string }
  length: number
  index: number
  storyId: string
}) {
  const { name, value } = props
  const openStoryHandler = useOpenStory()
  const el = document.querySelector(`[widgetid="content.widget.variable.${props.blockId}.${name}.${props.index}"]`)
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
                {props.name}
              </h4>
              <div
                className={css`
                  height: 300px;
                `}
              ></div>
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
                    openStoryHandler(props.storyId, { blockId: value.blockId })
                  }}
                >
                  Go to block
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
              padding: 0 5px;
              color: ${ThemingVariables.colors.text[0]};
              background-color: ${ThemingVariables.colors.primary[4]};
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
              if (!e.metaKey) {
                setVisible((old) => !old)
                return
              }
              openStoryHandler(props.storyId, { blockId: value.blockId })
            }}
          >
            {props.name}
          </div>
        </Tippy>,
        el
      )
    : null
}
