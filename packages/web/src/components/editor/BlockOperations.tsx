import { IconCommonDrag } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { PopoverMotionVariants } from '@app/styles/animations'
import { DndItemDataBlockIdsType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import styled from '@emotion/styled'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { AnimatePresence, motion } from 'framer-motion'
import React, { memo, useEffect, useMemo, useState } from 'react'
import { StyledDropdownMenuContent } from '../kit/DropDownMenu'
import { TellerySelectionType } from './helpers'
import { useEditor } from './hooks'
import { useBlockHovering } from './hooks/useBlockHovering'
import { useStorySelection } from './hooks/useStorySelection'
import { BlockOperationPopover } from './Popovers/BlockOperationPopover'

const BlockOperation = styled.div<{ padding: number }>`
  display: flex;
  padding: ${(props) => props.padding}px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  :hover {
    background-color: ${ThemingVariables.colors.primary[5]};
  }
`
const _BlockDragOperation = React.forwardRef<
  HTMLDivElement,
  {
    blockId: string
    storyId: string
    dragRef: React.MutableRefObject<HTMLDivElement | null>
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  }
>(({ children, ...props }, forwardedRef) => {
  const { blockId, storyId } = props
  const editor = useEditor()
  const [selectionState] = useStorySelection(storyId)
  const selectedBlockIds = useMemo(() => {
    if (
      !!(
        selectionState &&
        selectionState.type === TellerySelectionType.Block &&
        selectionState.selectedBlocks.includes(blockId) === true
      ) === false
    ) {
      return [blockId]
    }
    if (selectionState && selectionState.type === TellerySelectionType.Block) {
      return selectionState.selectedBlocks
    }
    return []
  }, [blockId, selectionState])

  const blockDrag = useDraggable({
    id: `drag-${blockId}`,
    data: {
      type: DnDItemTypes.BlockIds,
      ids: selectedBlockIds,
      storyId: storyId
    } as DndItemDataBlockIdsType
  })

  useEffect(() => {
    props.setIsDragging(blockDrag.isDragging)
  }, [blockDrag.isDragging, props])

  useEffect(() => {
    blockDrag.setNodeRef(props.dragRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockDrag.setNodeRef, props.dragRef])

  const listeners = useMemo(() => {
    return {
      ...blockDrag.listeners,
      onMouseDown: (e: React.SyntheticEvent) => {
        const selection = editor?.getSelection()
        if (
          !!(
            selection &&
            selection.type === TellerySelectionType.Block &&
            selection.selectedBlocks.includes(blockId) === true
          ) === false
        ) {
          editor?.selectBlocks([blockId])
        }
        blockDrag?.listeners?.onMouseDown(e)
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }, [blockDrag.listeners, blockId, editor])

  return (
    <>
      <BlockOperation
        ref={forwardedRef}
        padding={1}
        className={cx(
          'no-select',
          css`
            cursor: grab;
            width: 22px;
          `
        )}
        {...listeners}
        {...blockDrag.attributes}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          props.setOpen(true)
        }}
      >
        <IconCommonDrag color={ThemingVariables.colors.gray[0]} />
      </BlockOperation>
    </>
  )
})

const BlockDragOperation = memo(_BlockDragOperation)

export const _BlockOperations: React.FC<{
  blockId: string
  storyId: string
  dragRef: React.MutableRefObject<HTMLDivElement | null>
}> = (props) => {
  const { blockId } = props
  const blockHovring = useBlockHovering(blockId)
  const [isDragging, setIsDragging] = useState(false)
  const [open, setOpen] = useState(false)
  return (
    <>
      <DropdownMenu.Root
        onOpenChange={(open) => {
          setOpen(open)
        }}
        open={open}
      >
        <div
          className={css`
            position: absolute;
            transform: translateX(-30px);
            top: 0;
            height: 24px;
            width: 24px;
            display: inline-flex;
            align-items: center;
          `}
        >
          {/* use fake trigger to position dropdown content */}
          <DropdownMenu.Trigger
            className={css`
              width: 100%;
              height: 100%;
              position: absolute;
              left: 0;
              top: 0;
              pointer-events: none;
              opacity: 0;
            `}
          ></DropdownMenu.Trigger>

          <AnimatePresence>
            {(isDragging || blockHovring) && (
              <motion.div
                initial={'inactive'}
                animate={'active'}
                exit={'inactive'}
                variants={PopoverMotionVariants.fade}
              >
                <BlockDragOperation {...props} setIsDragging={setIsDragging} setOpen={setOpen} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <StyledDropdownMenuContent open={open} align="start" side="left">
          <BlockOperationPopover
            id={blockId}
            open={open}
            close={() => {
              setOpen(false)
            }}
          />
        </StyledDropdownMenuContent>
      </DropdownMenu.Root>
    </>
  )
}
export const BlockOperations = memo(_BlockOperations)
