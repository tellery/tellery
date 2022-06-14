import { getBlockElementById } from '@app/components/editor/helpers/contentEditable'
import { BlockSnapshot, getBlockFromSnapshot } from '@app/store/block'
import { Direction, Editor } from '@app/types'
import { CollisionDetection, UniqueIdentifier } from '@dnd-kit/core'
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

interface ICollision {
  id: UniqueIdentifier
  data: {
    value: number
  }
}

export const closetBorder: CollisionDetection = ({
  active,
  collisionRect,
  droppableRects,
  pointerCoordinates,
  droppableContainers
}) => {
  const hitedRects = droppableContainers
    .filter((container) => {
      const { id } = container
      const currentRect = droppableRects.get(id)
      if (!currentRect) return false
      if (
        collisionRect.left >= currentRect?.left &&
        collisionRect.top >= currentRect.top &&
        collisionRect.left <= currentRect.left + currentRect.width &&
        collisionRect.top <= currentRect.top + currentRect.height
      ) {
        return true
      }
      return false
    })
    .map(({ id, rect }) => {
      invariant(rect.current)
      return { id, data: { value: rect.current.width * rect.current.height } }
    })

  if (hitedRects.length) {
    return hitedRects.sort((a, b) => a.data.value - b.data.value)
  }

  const closestLeftDistances = droppableContainers
    .filter(({ id }) => {
      return id.toString().indexOf('row') === -1
    })
    .filter(({ id }) => {
      const currentRect = droppableRects.get(id)
      if (!currentRect) return false
      return (
        collisionRect.left <= currentRect.left &&
        collisionRect.top >= currentRect.top &&
        collisionRect.top <= currentRect.top + currentRect.height
      )
    })
    .map(({ id, rect }) => {
      invariant(rect.current)
      return { id, data: { value: rect.current.left - collisionRect.top } }
    }) as ICollision[]

  const closestRightDistances = droppableContainers
    .filter(({ id }) => {
      return id.toString().indexOf('row') === -1
    })
    .filter(({ id }) => {
      const currentRect = droppableRects.get(id)
      if (!currentRect) return false
      return (
        collisionRect.left >= currentRect.left + currentRect.width &&
        collisionRect.top >= currentRect.top &&
        collisionRect.top <= currentRect.top + currentRect.height
      )
    })
    .map(({ id }) => {
      const currentRect = droppableRects.get(id)
      if (!currentRect) return false
      return { id, data: { value: collisionRect.left - (currentRect.left + currentRect.width) } }
    }) as ICollision[]

  const closestTopDistances = droppableContainers
    .filter(({ id }) => {
      const currentRect = droppableRects.get(id)
      if (!currentRect) return false
      return (
        collisionRect.top <= currentRect.top &&
        collisionRect.left >= currentRect.left &&
        collisionRect.left <= currentRect.left + currentRect.width
      )
    })
    .map(({ id }) => {
      const currentRect = droppableRects.get(id)
      if (!currentRect) return false
      return { id, data: { value: currentRect.top - collisionRect.top } }
    }) as ICollision[]

  const closestBottomDistances = droppableContainers
    .filter(({ id }) => {
      const currentRect = droppableRects.get(id)
      if (!currentRect) return false
      return (
        collisionRect.top >= currentRect.top + currentRect.height &&
        collisionRect.left >= currentRect.left &&
        collisionRect.left <= currentRect.left + currentRect.width
      )
    })
    .map(({ id }) => {
      const currentRect = droppableRects.get(id)
      if (!currentRect) return false
      return { id, data: { value: collisionRect.top - (currentRect.top + currentRect.height) } }
    }) as ICollision[]

  const collisions = [
    ...closestBottomDistances,
    ...closestLeftDistances,
    ...closestRightDistances,
    ...closestTopDistances
  ]

  return collisions.sort((a, b) => a.data.value - b.data.value)
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
