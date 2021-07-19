import { css, cx } from '@emotion/css'
import dayjs from 'dayjs'
import React, { useMemo } from 'react'
import { Editor, Thought } from 'types'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { BlockComponent, registerBlock } from './utils'

export const ThoughtTitleBlock: BlockComponent<React.FC<{ block: Thought }>> = (props: { block: Thought }) => {
  const { block } = props

  const fakeBlock = useMemo(() => {
    return {
      ...block,
      content: {
        title: [[dayjs(block.content?.date ?? '').format('MMM DD, YYYY')]]
      }
    } as Editor.Block
  }, [block])

  if (!block) return null

  return (
    <div
      data-block-id={block.id}
      className={cx(
        css`
          position: relative;
          font-size: 2em;
          font-weight: bold;
          box-sizing: border-box;
          border: solid 1px transparent;
          outline: none;
          max-width: 100%;
          width: 100%;
          margin: 0 auto 20px auto;
          white-space: pre-wrap;
          word-break: break-word;
          caret-color: rgb(55, 53, 47);
          padding-top: 100px;
          text-align: left;
        `,
        'tellery-block'
      )}
    >
      {block && <ContentEditable block={fakeBlock} disableSlashCommand disableTextToolBar readonly />}
    </div>
  )
}

ThoughtTitleBlock.meta = {
  isText: true,
  hasChildren: false
}

registerBlock(Editor.BlockType.Thought, ThoughtTitleBlock)
