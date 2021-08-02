import { css, cx } from '@emotion/css'
import React from 'react'
import { IconVisualizationTable } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import type { Editor } from '@app/types'
import { ContentEditable } from './BlockBase/ContentEditable'
import { BlockTitle } from '.'

export const BlockContentOverview = (props: { block: Editor.Block }) => {
  const { block } = props
  return (
    <div
      className={cx(
        css`
          cursor: pointer;
        `,
        css`
          box-sizing: border-box;
          border: solid 1px transparent;
          div {
            outline: none;
          }
          position: relative;
          width: 100%;
          white-space: pre-wrap;
          word-break: break-word;
          caret-color: ${ThemingVariables.colors.text[0]};
          text-align: left;
          color: ${ThemingVariables.colors.text[1]};
          &:hover {
            background-color: ${ThemingVariables.colors.primary[4]};
          }
          & > {
            pointer-events: none;
          }
        `
      )}
    >
      {block.content?.title && <ContentEditable block={block} key={block.id} readonly />}
    </div>
  )
}

export const SimpleQuestionBlock = (props: { block: Editor.QuestionBlock }) => {
  const { block } = props
  return (
    <div
      className={css`
        display: inline-flex;
        align-items: center;
        font-size: 14px;
        background-color: ${ThemingVariables.colors.primary[4]};
        padding: 5px;
        border-radius: 5px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `}
    >
      <IconVisualizationTable />
      <BlockTitle block={block} />
    </div>
  )
}
