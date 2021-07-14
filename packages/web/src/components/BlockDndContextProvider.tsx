import { getDuplicatedBlocks } from '@app/context/editorTranscations'
import { useCreateEmptyBlock } from '@app/helpers/blockFactory'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { css } from '@emotion/css'
import { ContentBlocks } from 'components/editor/ContentBlock'
import { useSelectionArea } from 'hooks/useSelectionArea'
import invariant from 'invariant'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import ReactTestUtils from 'react-dom/test-utils'
import { useRecoilState } from 'recoil'
import { getBlockFromSnapshot, useBlockSnapshot } from 'store/block'
import { Direction, DnDItemTypes, DropItem, Editor } from 'types'
import {
  BlockDndContext,
  closetBorder,
  DroppingArea,
  DroppingAreaContext,
  FileDraggble,
  findDroppbleBlockIdAndDirection,
  getFakeDragbleElement,
  logger,
  MouseSensorOptions
} from '../context/blockDnd'
import { DndSensor } from '../lib/dnd-kit/dndSensor'
import { useSetUploadResource } from './editor/hooks/useUploadResource'

export const BlockDndContextProvider: React.FC = ({ children }) => {
  const [selectingBlockIds, setSelectingBlockIds] = useState<string[] | null>(null)
  const selectingBlockIdsRef = useRef<string[] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [droppingArea, setDroppingArea] = useRecoilState(DroppingArea)
  const droppingAreaRef = useRef<{ blockId: string; direction: Direction } | null>(null)
  const mouseSensor = useSensor(MouseSensor, MouseSensorOptions)
  const dragSensor = useSensor(DndSensor)
  const sensors = useSensors(dragSensor, mouseSensor)
  const dataTransferRef = useRef<DataTransfer | null>(null)

  const blockTranscations = useBlockTranscations()
  const createEmptyBlock = useCreateEmptyBlock()

  const handleDragCancel = useCallback(() => {
    logger('drag cancel')
    setIsDragging(false)
    setDroppingArea(null)
    droppingAreaRef.current = null
    setSelectingBlockIds(null)
  }, [setDroppingArea])

  const setUploadResource = useSetUploadResource()

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      logger('drag end', event)
      setIsDragging(false)

      const item = event.active.data.current as { type: string; storyId: string }
      logger('drag end', item, droppingAreaRef.current)
      if (droppingAreaRef.current) {
        if (item.type === DnDItemTypes.Block) {
          const id = droppingAreaRef.current.blockId
          const blockIds = selectingBlockIdsRef.current
          invariant(blockIds, 'blocks i snull')
          const over = event.over
          if (!over) return
          const overData = over.data.current
          const overStoryId = overData?.storyId
          invariant(overData?.storyId, 'overing story id is null')
          if (item.storyId !== overStoryId) {
            blockTranscations.insertBlocks(overStoryId, {
              blocks: getDuplicatedBlocks(
                blockIds.map((blockId) => getBlockFromSnapshot(blockId, snapshot)),
                overStoryId
              ),
              targetBlockId: id,
              direction: droppingAreaRef.current.direction
            })
          } else {
            blockTranscations.moveBlocks(overStoryId, {
              blockIds,
              targetBlockId: id,
              direction: droppingAreaRef.current.direction
            })
          }
        } else if (item.type === DnDItemTypes.File) {
          const over = event.over
          if (!over) return
          const overData = over.data.current
          const overStoryId = overData?.storyId
          logger('drga end', event, dataTransferRef.current)
          const files = dataTransferRef.current?.files
          invariant(files, 'files is empty')
          const fileBlocks = [...files].map(() =>
            createEmptyBlock({
              type: Editor.BlockType.File,
              storyId: overStoryId,
              parentId: overStoryId
            })
          )
          blockTranscations.insertBlocks(overStoryId, {
            blocks: fileBlocks,
            targetBlockId: droppingAreaRef.current.blockId,
            direction: droppingAreaRef.current.direction
          })
          fileBlocks.forEach((block, i) => {
            const file = files[i]
            setUploadResource({ blockId: block.id, file })
          })
          dataTransferRef.current = null
        } else {
          invariant(false, 'not supported dnd item type')
        }
      }

      setDroppingArea(null)
      droppingAreaRef.current = null
    },
    [setDroppingArea, blockTranscations, createEmptyBlock, setUploadResource]
  )

  const snapshot = useBlockSnapshot()

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const over = event.over
      if (!over) return
      const overData = over.data.current
      const leaveBlockId = overData?.id
      if (!leaveBlockId) return
      if (!event.active.rect.current?.translated) return

      const { top, left } = event.active.rect.current.translated
      // logger('move', offsetLeft, offsetTop)
      const dropAreaInfo = findDroppbleBlockIdAndDirection(
        leaveBlockId,
        {
          x: left,
          y: top
        },
        snapshot
      )
      const item = event.active.data.current as DropItem
      const blockIds = selectingBlockIdsRef.current
      // TODO: dnd-kit bug, drag move may trigger before drag start
      // if (!blockIds) return
      // TODO: Restore it
      if (dropAreaInfo && item.type === DnDItemTypes.Block && blockIds?.includes(dropAreaInfo[0])) {
        setDroppingArea(null)
      }

      if (dropAreaInfo) {
        setDroppingArea((value) => {
          const [id, direction] = dropAreaInfo as [string, Direction]
          if (value === null || value?.blockId !== id || value?.direction !== direction) {
            const newValue = {
              blockId: id,
              direction: direction
            }
            droppingAreaRef.current = newValue
            return newValue
          }
          droppingAreaRef.current = value
          return value
        })
      } else {
        setDroppingArea(null)
      }
    },
    [setDroppingArea, snapshot]
  )

  const { selectionRef } = useSelectionArea(
    useCallback((blockIds) => {
      setSelectingBlockIds(blockIds)
      selectingBlockIdsRef.current = blockIds
    }, [])
  )

  const triggerSelection = useCallback(
    (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (!selectionRef.current) {
        return
      }
      selectionRef.current.trigger(event, true)
    },
    [selectionRef]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setIsDragging(true)
    const data = event.active.data.current
    logger('drag start', event)
    if (data && data.type === DnDItemTypes.Block && data.id) {
      const selectingBlockIds = selectingBlockIdsRef.current ?? []
      const newSelectBlockIds = selectingBlockIds.includes(data.id) ? [...selectingBlockIds] : [data.id]
      selectingBlockIdsRef.current = newSelectBlockIds
      setSelectingBlockIds(newSelectBlockIds)
    }
  }, [])

  const blockDndContext = useMemo(() => {
    return {
      selectedBlockIds: selectingBlockIds,
      triggerSelection
    }
  }, [selectingBlockIds, triggerSelection])

  return (
    <div
      onDrop={(e) => {
        dataTransferRef.current = e.dataTransfer
        e.preventDefault()
      }}
      onDragOver={(e) => {
        if (isDragging === false) {
          logger('on darg entter', e, e.nativeEvent)
          const handle = getFakeDragbleElement()
          const nativeEvent = e.nativeEvent
          e.persist()
          handle.style.left = `${nativeEvent.clientX}px`
          handle.style.top = `${nativeEvent.clientY}px`

          ReactTestUtils.Simulate.dragEnter(handle, {
            nativeEvent: e.nativeEvent,
            clientX: nativeEvent.clientX,
            clientY: nativeEvent.clientY,
            button: nativeEvent.button
          })
        }
      }}
    >
      <DndContext
        collisionDetection={closetBorder}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        sensors={sensors}
        onDragStart={handleDragStart}
      >
        <FileDraggble />
        <BlockDndContext.Provider value={blockDndContext}>
          <DroppingAreaContext.Provider value={droppingArea}>
            {children}
            <DragOverlay
              dropAnimation={null}
              className={css`
                opacity: 0.5;
              `}
            >
              {isDragging ? (
                selectingBlockIds ? (
                  <ContentBlocks blockIds={selectingBlockIds} readonly parentType={Editor.BlockType.Story} />
                ) : (
                  // TODO: drop indicator
                  <div
                    className={css`
                      width: 10px;
                      height: 10px;
                    `}
                  ></div>
                )
              ) : null}
            </DragOverlay>
          </DroppingAreaContext.Provider>
        </BlockDndContext.Provider>
      </DndContext>
    </div>
  )
}
