import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import { IconCommonDrag } from 'assets/icons'
import { AnimatePresence, motion } from 'framer-motion'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useRecoilValue } from 'recoil'
import { editorTransformBlockPopoverState } from 'store'
import { ThemingVariables } from 'styles'
import { DnDItemTypes } from 'types'
import { BlockOperation } from './BlockOperation'
import { useEditor } from './hooks'
import { BlockOperationPopover } from './Popovers/BlockOperationPopover'
import { IsBlockHovering } from './store'
import Icon from 'components/kit/Icon'

const BlockDragOperation: React.FC<{
  blockId: string
  storyId: string
  dragRef: React.MutableRefObject<HTMLDivElement | null>
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
}> = (props) => {
  const { blockId, storyId } = props

  const blockDrag = useDraggable({
    id: `drag-${blockId}`,
    data: {
      type: DnDItemTypes.Block,
      id: blockId,
      storyId: storyId
    }
  })

  useEffect(() => {
    props.setIsDragging(blockDrag.isDragging)
  }, [blockDrag.isDragging, props])

  useEffect(() => {
    blockDrag.setNodeRef(props.dragRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockDrag.setNodeRef, props.dragRef])

  const [, setTransformPopoverOpen] = useAtom(editorTransformBlockPopoverState(blockId))
  const editor = useEditor()

  const onOperationsClick = useCallback(() => {
    editor?.selectBlocks([blockId])
  }, [editor, blockId])

  const listeners = useMemo(() => {
    return {
      ...blockDrag.listeners,
      onMouseDown: (e: React.SyntheticEvent) => {
        console.log('on mouse down', e)
        blockDrag?.listeners?.onMouseDown(e)
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }, [blockDrag.listeners])

  return (
    <>
      <BlockOperation
        padding={1}
        className={cx(
          'no-select',
          css`
            cursor: pointer;
            width: 22px;
          `
        )}
        {...listeners}
        {...blockDrag.attributes}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setTransformPopoverOpen(true)
          onOperationsClick()
        }}
      >
        <Icon icon={IconCommonDrag} color={ThemingVariables.colors.gray[0]} />
      </BlockOperation>
    </>
  )
}

export const _BlockOperations: React.FC<{
  blockId: string
  storyId: string
  dragRef: React.MutableRefObject<HTMLDivElement | null>
}> = (props) => {
  const { blockId } = props
  const blockHovring = useRecoilValue(IsBlockHovering(blockId))
  const [isDragging, setIsDragging] = useState(false)

  // console.log('block operations', blockHovring, isDragging)

  return (
    <>
      <BlockOperationPopover id={blockId} />
      <AnimatePresence>
        {(blockHovring || isDragging) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div
              style={{
                opacity: blockHovring ? 1 : 0
              }}
              className={css`
                position: absolute;
                transform: translateX(-30px);
                top: 0;
                height: 24px;
                display: inline-flex;
                align-items: center;
                transition: opacity 0.35s;
              `}
            >
              <div
                className={css`
                  display: flex;
                `}
              >
                <BlockDragOperation {...props} setIsDragging={setIsDragging} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
export const BlockOperations = _BlockOperations
