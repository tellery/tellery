import { Operation, useCommit } from '@app/hooks/useCommit'
import { css, cx } from '@emotion/css'
import { motion, useMotionValue } from 'framer-motion'
import { useBlockSuspense, useMgetBlocksSuspense } from '@app/hooks/api'
import { useDimensions } from '@app/hooks/useDimensions'
import produce from 'immer'
import invariant from 'tiny-invariant'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { createTranscation } from '../../../context/editorTranscations'
import { BlockChildren } from '../ContentBlock'
import { DroppingAreaIndicator } from '../DroppingAreaIndicator'
import { DroppleableOverlay } from '../DroppleableOverlay'
import { useBlockBehavior } from '../hooks/useBlockBehavior'
import { registerBlock, BlockComponent } from './utils'

const BREAK_POINT = 500
const GAP_WIDTH = 40

const GridBlock: BlockComponent<
  React.FC<{
    block: Editor.Block
  }>
> = ({ block }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const dimensions = useDimensions(ref, 250)
  const [isDragging, setIsDragging] = useState(false)
  const [widths, setWidths] = useState<number[]>([])
  const blockChildren = useMgetBlocksSuspense(block.children ?? [])
  const { small, readonly } = useBlockBehavior()
  const [singleColumn, setSingleColumn] = useState(false)
  const commit = useCommit()

  const updateWidths = useCallback(() => {
    if (block.children?.length) {
      const operations: Operation[] = []
      block.children!.forEach((id, index) => {
        operations.push({
          cmd: 'update',
          id: id,
          table: 'block',
          path: ['format'],
          args: {
            width: widths[index]
          }
        })
      })
      commit({ storyId: block.storyId!, transcation: createTranscation({ operations: operations }) })
    }
  }, [block.children, block.storyId, commit, widths])

  useEffect(() => {
    if (ref.current === null) return
    const resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      setSingleColumn(entries[0].contentRect.width < BREAK_POINT)
    })
    resizeObserver.observe(ref.current)
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    if (isDragging === false && block.children?.length && blockChildren) {
      setWidths(
        block.children!.map((id) => {
          const block = blockChildren.find((block) => block.id === id) as Editor.Block
          invariant(block, 'block not found')
          return block.format?.width ?? 1 / block.children!.length
        })
      )
    }
  }, [block.children, blockChildren, isDragging])

  return (
    <>
      <div
        data-block-id={block.id}
        className={cx(
          css`
            box-sizing: border-box;
            position: relative;
            width: 100%;
            align-self: center;
            position: relative;
            display: flex;
            flex-wrap: wrap;
            div {
              outline: none;
            }
          `,
          'tellery-block',
          `tellery-row-block`
        )}
        ref={ref}
      >
        {!small && !readonly && <DroppingAreaIndicator blockId={block.id} />}

        {!small && !readonly && <DroppleableOverlay type="row" blockId={block.id} storyId={block.storyId!} />}

        {block ? (
          <>
            {blockChildren &&
              widths.length === block.children!.length &&
              block.children?.map((columnBlockId, i) => {
                return (
                  <ColumnBlock
                    key={columnBlockId}
                    id={columnBlockId}
                    width={widths[i]}
                    setWidths={setWidths}
                    index={i}
                    singleColumn={singleColumn}
                    setIsDragging={setIsDragging}
                    parentWidth={dimensions.width}
                    isDragging={isDragging}
                    updateWidths={updateWidths}
                    childrenCount={block.children!.length}
                    // block={blocksMap![columnBlockId]}
                  />
                )
              })}
          </>
        ) : (
          <div
            className={css`
              width: 100%;
              align-self: stretch;
            `}
          >
            {/* <Skeleton></Skeleton> */}
          </div>
        )}
      </div>
    </>
  )
}

GridBlock.meta = {
  isText: false,
  hasChildren: true
}

registerBlock(Editor.BlockType.Row, GridBlock)
// _GridBlock.whyDidYouRender = true
// export const GridBlock = memo(_GridBlock, (prev, next) => {
//   return prev.block.version === next.block.version
// })

const ColumnBlock: BlockComponent<
  React.FC<{
    id: string
    childrenCount: number
    width: number
    index: number
    singleColumn: boolean
    setWidths: React.Dispatch<React.SetStateAction<number[]>>
    setIsDragging: React.Dispatch<React.SetStateAction<boolean>>
    updateWidths: () => void
    parentWidth: number
    isDragging: boolean
    // block: Editor.Block
  }>
> = ({
  id,
  childrenCount,
  singleColumn,
  setIsDragging,
  index,
  // block,
  parentWidth,
  isDragging,
  setWidths,
  width,
  updateWidths
}) => {
  const block = useBlockSuspense(id)
  const { small, readonly } = useBlockBehavior()
  const x = useMotionValue(width * (parentWidth - (childrenCount - 1) * GAP_WIDTH))
  const ref = useRef<HTMLDivElement | null>(null)

  const blockisDraggingRef = useRef(false)

  const onResizeDragEnd = useCallback(() => {
    console.log('resize end')
    setIsDragging(false)
    updateWidths()
    x.stop()
    blockisDraggingRef.current = false
  }, [setIsDragging, updateWidths, x])

  useEffect(() => {
    x.set(width * (parentWidth - (childrenCount - 1) * GAP_WIDTH))
  }, [childrenCount, isDragging, parentWidth, width, x])

  useEffect(() => {
    const unsubscribe = x.onChange((x) => {
      if (!x) return
      if (blockisDraggingRef.current === false) return
      setWidths((widths) => {
        return produce(widths, (draft) => {
          const oldWidth = draft[index]
          const newWdith = x / (parentWidth - (childrenCount - 1) * GAP_WIDTH)
          const newNextWidth = draft[index + 1] + oldWidth - newWdith
          if (newWdith > 1 / 6 && newNextWidth > 1 / 6) {
            draft[index] = newWdith
            draft[index + 1] = newNextWidth
          }
        })
      })
    })
    return () => {
      unsubscribe()
    }
  }, [index, setWidths, x, parentWidth, childrenCount])

  useEffect(() => {
    if (isDragging === false) {
      x.set(width * (parentWidth - (childrenCount - 1) * GAP_WIDTH))
    }
  }, [childrenCount, isDragging, parentWidth, width, x])

  return (
    <>
      <div
        data-block-id={id}
        className={cx(
          css`
            flex-grow: 0;
            flex-shrink: 0;
            align-self: flex-start;
            padding: 12px 0;
          `,

          'column-block'
        )}
        ref={ref}
        style={{
          width: singleColumn ? '100%' : `calc((100% - ${(childrenCount - 1) * GAP_WIDTH}px) * ${width})`
        }}
      >
        <div
          className={css`
            width: 100%;
            position: relative;
          `}
        >
          {!small && !readonly && <DroppingAreaIndicator blockId={block.id} />}
          <>
            {block ? (
              <>
                {block.children && block.children.length > 0 && (
                  <>
                    <BlockChildren childrenIds={block.children} parentType={Editor.BlockType.Column} />
                  </>
                )}
              </>
            ) : (
              <div
                className={css`
                  width: 100%;
                  align-self: stretch;
                `}
              >
                {/* <Skeleton></Skeleton> */}
              </div>
            )}
          </>
          {index < childrenCount - 1 && singleColumn === false && readonly === false && (
            <motion.div
              title="drag to resize"
              dragMomentum={false}
              whileHover={{
                opacity: 1
              }}
              whileDrag={{
                opacity: 1
              }}
              drag={'x'}
              dragElastic={false}
              onDragEnd={onResizeDragEnd}
              onDragStart={() => {
                blockisDraggingRef.current = true
                setIsDragging(true)
              }}
              // onDragStart={measure}
              onMouseDown={(e) => {
                e.stopPropagation()
              }}
              style={{
                x: x
              }}
              className={css`
                position: absolute;
                bottom: 0;
                top: 0;
                left: 15px;
                background-color: ${ThemingVariables.colors.gray[1]};
                opacity: 0;
                margin: auto;
                cursor: ew-resize;
                user-select: none;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100;
                border-radius: 10px;
                width: 6px;
                height: 100%;
              `}
            ></motion.div>
          )}
        </div>
      </div>
      {index < childrenCount - 1 && singleColumn === false && (
        <div
          className={css`
            width: 40px;
            position: relative;
          `}
        >
          <DroppleableOverlay blockId={block.id} storyId={block.storyId!} />
        </div>
      )}
    </>
  )
}

ColumnBlock.meta = {
  isText: false,
  hasChildren: true
}

registerBlock(Editor.BlockType.Column, ColumnBlock)

// export const ColumnBlock = memo(_ColumnBlock)
