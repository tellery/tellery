import { useBlockHovering } from '@app/hooks/useBlockHovering'
import { css } from '@emotion/css'
import { motion, PanInfo } from 'framer-motion'
import invariant from 'tiny-invariant'
import React, { useCallback } from 'react'
import { Editor } from '@app/types'
import type { BlockFormatInterface } from '../hooks'
const HANDLE_WIDTH = 10

export const BlockResizer: React.FC<{
  blockFormat: BlockFormatInterface
  parentType: Editor.BlockType
  blockId: string
  contentRef: React.MutableRefObject<HTMLElement | null>
  disableY?: boolean
  keepAspectRatio?: boolean
  offsetY?: number
}> = ({ blockFormat, parentType, blockId, contentRef, disableY = false, keepAspectRatio = false, offsetY = 0 }) => {
  const onResizeDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void = useCallback(
    (event, info) => {
      invariant(contentRef.current, 'content ref is null')
      blockFormat.onResizeDragEnd(event, info, {
        keepAspectRatio,
        contentRef: contentRef
      })
    },
    [blockFormat, keepAspectRatio, contentRef]
  )

  const onResizeDragStart: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void = useCallback(
    (event, info) => {
      const rect = contentRef.current?.getBoundingClientRect()
      invariant(rect, 'rect is null')
      blockFormat.onResizeDragStart(event, info, { dimensions: rect, contentRef: contentRef })
    },
    [blockFormat, contentRef]
  )

  const isHovering = useBlockHovering(blockId)
  return (
    <>
      {!disableY && (
        <motion.div
          title="drag to resize"
          dragMomentum={false}
          drag={'y'}
          dragElastic={0}
          onDragEnd={onResizeDragEnd}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
          }}
          style={{
            y: blockFormat.y,
            opacity: isHovering || blockFormat.isDragging ? 1 : 0,
            bottom: `${-offsetY - HANDLE_WIDTH / 2}px`
          }}
          onDragStart={onResizeDragStart}
          className={css`
            width: 100%;
            height: 10px;
            position: absolute;
            right: 0;
            left: 0;
            margin: auto;
            cursor: ns-resize;
            display: flex;
            justify-content: center;
            align-items: center;
            user-select: none;
          `}
        ></motion.div>
      )}
      {parentType !== Editor.BlockType.Column && (
        <motion.div
          title="drag to resize"
          dragMomentum={false}
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          dragConstraints={
            {
              // left: 200
            }
          }
          onClick={(e) => {
            e.preventDefault()
          }}
          drag={'x'}
          dragElastic={0}
          onDragStart={onResizeDragStart}
          onDragEnd={onResizeDragEnd}
          style={{
            x: blockFormat.x,
            opacity: isHovering || blockFormat.isDragging ? 1 : 0
          }}
          className={css`
            position: absolute;
            bottom: 0;
            top: 0;
            right: ${-HANDLE_WIDTH / 2}px;
            margin: auto;
            cursor: ew-resize;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 10px;
            height: 100%;
          `}
        ></motion.div>
      )}
    </>
  )
}
