import type { BlockSnapshot } from '@app/store/block'
import type { Editor } from '@app/types'
import { flattenDeep } from 'lodash'
import invariant from 'tiny-invariant'

export const DEFAULT_QUESTION_BLOCK_ASPECT_RATIO = 16 / 9
export const DEFAULT_QUESTION_BLOCK_WIDTH = 0.7

export const getFilteredOrderdSubsetOfBlocks = (
  blocksMap: Record<string, Editor.BaseBlock>,
  rootId: string,
  filter: (block: Editor.BaseBlock) => boolean
): Editor.BaseBlock[] => {
  const children = blocksMap[rootId].children ?? []
  const currentBlock = blocksMap[rootId]
  return [
    ...(filter(currentBlock) ? [currentBlock] : []),
    ...flattenDeep(
      children.map((blockId) => {
        return getFilteredOrderdSubsetOfBlocks(blocksMap, blockId, filter)
      })
    )
  ]
}

export const getSubsetOfBlocksSnapshot = (blockSnapshot: BlockSnapshot, blockIds: string[]) => {
  const result: Record<string, Editor.BaseBlock> = {}
  const idStack = [...blockIds]

  while (idStack.length) {
    const currentNodeId = idStack.pop()!
    const block = blockSnapshot.get(currentNodeId)
    invariant(block, 'block is undefined')
    result[currentNodeId] = { ...block }
    idStack.unshift(...(result[currentNodeId].children ?? []))
  }

  return result
}
