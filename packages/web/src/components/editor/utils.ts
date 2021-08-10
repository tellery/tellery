import type { BlockSnapshot } from '@app/store/block'
import { Editor } from '@app/types'
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

export const TOKEN_MAP: { [key: string]: { type: Editor.BlockType } } = {
  '# ': { type: Editor.BlockType.Header },
  '## ': { type: Editor.BlockType.SubHeader },
  '### ': { type: Editor.BlockType.SubSubHeader },
  '- ': { type: Editor.BlockType.BulletList },
  '* ': { type: Editor.BlockType.BulletList },
  '> ': { type: Editor.BlockType.Quote },
  '》 ': { type: Editor.BlockType.Quote },
  '---': { type: Editor.BlockType.Divider },
  '[]': { type: Editor.BlockType.Todo },
  '【】': { type: Editor.BlockType.Todo },
  '```': { type: Editor.BlockType.Code },
  '···': { type: Editor.BlockType.Code },
  '>> ': { type: Editor.BlockType.Toggle },
  '》》 ': { type: Editor.BlockType.Toggle },
  '?? ': { type: Editor.BlockType.Question },
  '？？ ': { type: Editor.BlockType.Question },
  '1. ': { type: Editor.BlockType.NumberedList },
  '1。': { type: Editor.BlockType.NumberedList },
  '$$ ': { type: Editor.BlockType.Equation }
}
