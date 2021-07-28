import type { Editor } from '@app/types'
import { flattenDeep } from 'lodash'

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
