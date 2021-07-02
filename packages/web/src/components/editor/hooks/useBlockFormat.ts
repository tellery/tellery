import { MotionValue, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import invariant from 'invariant'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { Editor } from 'types'
import { useEditor } from '../hooks'
import { stripUnit } from 'polished'
import debug from 'debug'

const logger = debug('tellery:blockformat')

export const DEFAULT_ASPECT_RATIO = 16 / 9
export const DEFAULT_WIDTH = 0.7

export type BlockFormatResizerDragEvent = (
  event: MouseEvent | TouchEvent | PointerEvent,
  info: PanInfo,
  options: {
    dimensions?: {
      width: number
      height: number
    }
    keepAspectRatio?: boolean
    contentRef?: HTMLDivElement
  }
) => void

export interface BlockFormatInterface {
  width: MotionValue<number>
  paddingTop: MotionValue<string>
  onResizeDragEnd: BlockFormatResizerDragEvent
  onResizeDragStart: BlockFormatResizerDragEvent
  x: MotionValue<number>
  y: MotionValue<number>
  isDragging: boolean
}

export const useBlockFormat = (block: Editor.Block) => {
  const [isDragging, setIsDragging] = useState(false)
  const startDimensionRef = useRef<{ width: number; height: number } | null>(null)
  const editor = useEditor<Editor.Block>()

  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const aspectRatio = block.format?.aspectRatio ?? DEFAULT_ASPECT_RATIO

  const width = useTransform(x, (latestX) => {
    const initWidth = startDimensionRef.current?.width ?? 0
    const newWidth = latestX * 2 + initWidth
    if (isDragging === false) return `${100 * (block.format?.width ?? 1)}%`
    return newWidth
  })

  const height = useTransform(y, (latestY) => {
    const initHeight = startDimensionRef.current?.height ?? 0
    const newHeight = latestY + initHeight
    return newHeight
  })

  const paddingTop = useTransform([width, height], ([latestWidth, latestHeight]) => {
    if (isDragging === false) {
      return `${100 / aspectRatio}%`
    } else {
      return `${100 / ((latestWidth as number) / latestHeight)}%`
    }
  })

  const onResizeDragStart: BlockFormatResizerDragEvent = useCallback((event, info, { dimensions }) => {
    invariant(dimensions, 'dimensions is undefined')
    logger('drag start')
    startDimensionRef.current = dimensions
    setIsDragging(true)
  }, [])

  const onResizeDragEnd = useCallback(
    (event, info, { keepAspectRatio, contentRef }: { keepAspectRatio: boolean; contentRef: HTMLDivElement }) => {
      invariant(editor, 'editor is null')
      const rect = contentRef.getBoundingClientRect()
      const blockElement = contentRef.closest('.tellery-block')
      invariant(blockElement, 'blockElement is null')
      // const closetParent = blockElement.parentElement?.offsetWidth

      // const parentWidthString = getComputedStyle(closetParent as HTMLDivElement).width
      // const parentWidth = (stripUnit(parentWidthString) as number) -
      const parentElement = blockElement.parentElement
      invariant(parentElement, 'closetParent is null')

      const parentPaddingLeftString = getComputedStyle(parentElement as HTMLDivElement).paddingLeft
      const parentPaddingRightString = getComputedStyle(parentElement as HTMLDivElement).paddingRight

      const parentPadding =
        (stripUnit(parentPaddingLeftString) as number) + (stripUnit(parentPaddingRightString) as number)
      const parentWidth = parentElement.offsetWidth - parentPadding

      editor?.setBlockValue(block.id, (draftBlock) => {
        if (!draftBlock.format) {
          draftBlock.format = {
            width: DEFAULT_WIDTH,
            aspectRatio: DEFAULT_ASPECT_RATIO
          }
        }
        // const widthValue = width.get()
        // const heightValue = height.get()
        // invariant(typeof heightValue === 'number' && typeof widthValue === 'number', 'height or width invalid')
        logger('resize end', 'width', rect.width, 'parentWidth', parentWidth, 'height', rect.height)
        draftBlock.format.width = Math.max(rect.width / parentWidth, 1 / 6)
        if (keepAspectRatio === false) {
          draftBlock.format.aspectRatio = Math.max(rect.width / rect.height, 0.5)
        }

        logger(draftBlock.format.width, draftBlock.format.aspectRatio)
      })
      startDimensionRef.current = null
      setIsDragging(false)
      // TODO: use settimeout because width and isDragging not sync
      setTimeout(() => {
        x.stop()
        y.stop()
        x.set(0)
        y.set(0)
      }, 0)
    },
    [editor, block.id, x, y]
  )

  return useMemo(
    () => ({
      width: width,
      x,
      y,
      paddingTop,
      onResizeDragEnd,
      onResizeDragStart,
      isDragging
    }),
    [width, x, y, paddingTop, onResizeDragEnd, onResizeDragStart, isDragging]
  ) as BlockFormatInterface
}
