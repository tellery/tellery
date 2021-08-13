import { ThemingVariables } from '@app/styles'
import type { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import React from 'react'
import { ContentEditable } from './BlockBase/ContentEditable'

export const BlockContentOverview = (props: { block: Editor.BaseBlock }) => {
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
      {block.content?.title && <ContentEditable block={block} key={block.id} readonly disableTextAlign />}
    </div>
  )
}
