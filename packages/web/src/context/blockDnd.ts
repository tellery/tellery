import { getBlockElementById } from '@app/components/editor/helpers/contentEditable'
import { BlockSnapshot, getBlockFromSnapshot } from '@app/store/block'
import { Direction, Editor } from '@app/types'
import { CollisionDetection } from '@dnd-kit/core'
import debug from 'debug'
import invariant from 'tiny-invariant'
export const logger = debug('tellery:dnd')

export interface XYCoord {
  x: number
  y: number
}

export const MouseSensorOptions = {
  // Require the mouse to move by 10 pixels before activating
  activationConstraint: {
    distance: 10
    // delay: 250,
    // tolerance: 100
  }
}

export const getFakeDragbleElement = () => {
  const element = document.getElementById('fake-drag-handler')
  invariant(element, 'element is null')
  return element
}

const getMinvalueEntry = (entries: [string, number][]) => {
  let lowest = Infinity
  let lowestId = null
  for (const [id, value] of entries) {
    if (value <= lowest) {
      lowest = value
      lowestId = id
    }
  }
  if (lowestId) {
    return [lowestId, lowest]
  }
  return null
}

export const closetBorder: CollisionDetection = (rects, centerRect) => {
  const hitedRects = rects
    .filter((rectEntry) => {
      const [, rect] = rectEntry
      if (
        centerRect.left >= rect.offsetLeft &&
        centerRect.top >= rect.offsetTop &&
        centerRect.left <= rect.offsetLeft + rect.width &&
        centerRect.top <= rect.offsetTop + rect.height
      ) {
        return true
      }
      return false
    })
    .map(([_, rect]) => {
      return [_, rect.width * rect.height]
    }) as [string, number][]

  if (hitedRects.length) {
    const result = getMinvalueEntry(hitedRects)!
    return result[0] as string
  }

  const closestLeftDistances = rects
    .filter(([id]) => {
      return id.indexOf('row') === -1
    })
    .filter(([_, rect]) => {
      return (
        centerRect.left <= rect.offsetLeft &&
        centerRect.top >= rect.offsetTop &&
        centerRect.top <= rect.offsetTop + rect.height
      )
    })
    .map(([id, rect]) => {
      return [id, rect.offsetLeft - centerRect.offsetTop]
    }) as [string, number][]

  const closetLeft = getMinvalueEntry(closestLeftDistances)

  const closestRightDistances = rects
    .filter(([id]) => {
      return id.indexOf('row') === -1
    })
    .filter(([_, rect]) => {
      return (
        centerRect.left >= rect.offsetLeft + rect.width &&
        centerRect.top >= rect.offsetTop &&
        centerRect.top <= rect.offsetTop + rect.height
      )
    })
    .map(([id, rect]) => {
      return [id, centerRect.left - (rect.offsetLeft + rect.width)]
    }) as [string, number][]
  const closetRight = getMinvalueEntry(closestRightDistances)

  const closestTopDistances = rects
    .filter(([_, rect]) => {
      return (
        centerRect.top <= rect.offsetTop &&
        centerRect.left >= rect.offsetLeft &&
        centerRect.left <= rect.offsetLeft + rect.width
      )
    })
    .map(([id, rect]) => {
      return [id, rect.offsetTop - centerRect.top]
    }) as [string, number][]
  const closetTop = getMinvalueEntry(closestTopDistances)

  const closestBottomDistances = rects
    .filter(([_, rect]) => {
      return (
        centerRect.top >= rect.offsetTop + rect.height &&
        centerRect.left >= rect.offsetLeft &&
        centerRect.left <= rect.offsetLeft + rect.width
      )
    })
    .map(([id, rect]) => {
      return [id, centerRect.top - (rect.offsetTop + rect.height)]
    }) as [string, number][]

  const closetBottom = getMinvalueEntry(closestBottomDistances)

  const closet = getMinvalueEntry(
    [closetLeft, closetRight, closetTop, closetBottom].filter((x) => !!x) as [string, number][]
  )

  if (closet) {
    return closet[0] as string
  }

  return null
}

export const findDroppbleBlockIdAndDirection = (
  blockId: string,
  point: XYCoord,
  snapshot: BlockSnapshot
): [string, Direction] | null => {
  const block = getBlockFromSnapshot(blockId, snapshot)

  if (block === undefined || block.type === Editor.BlockType.Story) {
    return null
  }
  const blockElement = getBlockElementById(blockId)
  let direction: Direction = 'top'

  const isFirstLayer = block.parentId === block.storyId
  const blockRect = blockElement.getBoundingClientRect()
  //       ——————————
  //      ｜   TOP   ｜
  // LEFT ｜---------｜ RIGHT
  //      ｜  BOTTOM ｜
  //       ——————————

  // logger('find ', point.y, blockRect.y, blockRect.height, blockRect.y + blockRect.height / 2)
  if (point.y < blockRect.y + blockRect.height / 2) {
    direction = 'top'
  } else {
    direction = 'bottom'
  }
  if (point.x < blockRect.x) {
    direction = 'left'
  }
  if (point.x > blockRect.x + blockRect.width) {
    direction = 'right'
  }

  if (block.type === Editor.BlockType.Column) {
    const parentBlock = getBlockFromSnapshot(block.parentId, snapshot)
    const index = parentBlock.children?.findIndex((id: string) => id === block.id)
    if (direction === 'left' || direction === 'right') {
      if (index && index !== parentBlock.children!.length - 1 && direction === 'right') {
        return [parentBlock.children![index + 1], 'left']
      }
    }

    if (direction === 'top' || direction === 'bottom') {
      return findDroppbleBlockIdAndDirection(block.parentId, point, snapshot)
    }

    return [blockId, direction]
  }

  if (block.type === Editor.BlockType.Row) {
    if (direction === 'left' || direction === 'right') {
      return findDroppbleBlockIdAndDirection(block.parentId, point, snapshot)
    }
  }

  if (isFirstLayer === false && (direction === 'left' || direction === 'right')) {
    return findDroppbleBlockIdAndDirection(block.parentId, point, snapshot)
  }

  if (direction === 'top') {
    const parentBlock = getBlockFromSnapshot(block.parentId, snapshot)
    const index = parentBlock.children!.findIndex((id: string) => id === block.id)
    if (index >= 1) {
      return [parentBlock.children![index - 1], 'bottom']
    }
  }

  return [blockId, direction]
}