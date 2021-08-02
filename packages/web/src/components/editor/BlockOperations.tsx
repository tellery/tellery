import { IconCommonDrag } from '@app/assets/icons'
import { editorTransformBlockPopoverState } from '@app/store'
import { ThemingVariables } from '@app/styles'
import { DndItemDataBlockIdsType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css, cx } from '@emotion/css'
import { AnimatePresence, motion } from 'framer-motion'
import { useAtom } from 'jotai'
import React, { useEffect, useMemo, useState } from 'react'
import { useBlockHovering } from '../../hooks/useBlockHovering'
import { BlockOperation } from './BlockOperation'
import { TellerySelectionType } from './helpers'
import { useEditor } from './hooks'
import { useStorySelection } from './hooks/useStorySelection'
import { BlockOperationPopover } from './Popovers/BlockOperationPopover'

const BlockDragOperation: React.FC<{
  blockId: string
  storyId: string
  dragRef: React.MutableRefObject<HTMLDivElement | null>
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
}> = (props) => {
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

  const [, setTransformPopoverOpen] = useAtom(editorTransformBlockPopoverState(blockId))

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
        }}
      >
        <IconCommonDrag color={ThemingVariables.colors.gray[0]} />
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
  const blockHovring = useBlockHovering(blockId)
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
