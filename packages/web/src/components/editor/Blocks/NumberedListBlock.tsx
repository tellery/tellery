import { css, cx } from '@emotion/css'
import { useBlockSuspense, useMgetBlocks } from '@app/hooks/api'
import React, { ReactNode, useMemo } from 'react'
import { Editor } from '@app/types'
import { ContentEditable } from '../BlockBase/ContentEditable'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { BlockComponent } from './utils'

const OrderOfBlock: React.FC<{ blockId: string; parentId: string }> = ({ blockId, parentId }) => {
  const parentBlock = useBlockSuspense(parentId)
  const { data: sibilingBlocks } = useMgetBlocks(parentBlock?.children)

  const loaded = useMemo(
    () => sibilingBlocks && parentBlock?.children && parentBlock?.children.every((id) => sibilingBlocks[id]),
    [parentBlock?.children, sibilingBlocks]
  )

  const orderNumber = useMemo(() => {
    if (loaded) {
      let index = 0
      const endIndex = parentBlock!.children!.indexOf(blockId)
      for (let i = endIndex; i >= 0; i--) {
        const currentBlockId = parentBlock!.children![i]
        const currentBlock = sibilingBlocks![currentBlockId]
        if (currentBlock.type === Editor.BlockType.NumberedList) {
          index += 1
        } else {
          break
        }
      }
      return index
    }
    return 0
  }, [loaded, parentBlock, blockId, sibilingBlocks])

  return (
    <div
      className={css`
        flex-shrink: 0;
        user-select: none;
        margin-right: 4px;
      `}
    >
      {loaded && `${orderNumber}.`}
    </div>
  )
}

const _NumberedListBlock: BlockComponent<
  React.FC<{
    block: Editor.Block
    children: ReactNode
  }>
> = ({ block, children }) => {
  const { readonly } = useBlockBehavior()

  return (
    <>
      <div
        className={cx(
          css`
            display: flex;
            line-height: var(--line-height);
          `
        )}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: center;
            height: var(--line-height-em);
            width: 1.5em;
          `}
        >
          <OrderOfBlock blockId={block.id} parentId={block.parentId} />
        </div>
        <ContentEditable block={block} readonly={readonly}></ContentEditable>
      </div>
      {children}
    </>
  )
}

_NumberedListBlock.meta = {
  hasChildren: true,
  isText: true
}

export const NumberedListBlock = _NumberedListBlock
