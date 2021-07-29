import { createEmptyBlock } from '@app/helpers/blockFactory'
import type { Operation, Transcation } from '@app/hooks/useCommit'
import { dequal } from 'dequal'
import invariant from 'tiny-invariant'
import { cloneDeep } from 'lodash'
import { nanoid } from 'nanoid'
import { toast } from 'react-toastify'
import { BlockSnapshot, getBlockFromSnapshot } from '@app/store/block'
import { Editor } from '@app/types'
import { mergeTokens } from '../components/editor'
import { isQuestionLikeBlock } from '@app/components/editor/Blocks/utils'

export const createTranscation = ({ operations }: { operations: Operation[] }) => {
  return {
    id: nanoid(),
    operations
  }
}

export const getIndentionOperations = (
  block: Editor.BaseBlock,
  previousBlock: Editor.Block,
  parentBlock: Editor.BaseBlock,
  blockIds: string[]
) => {
  const operations: Operation[] = []
  const previousId = previousBlock.id
  let parentId = ''

  operations.push({
    cmd: 'listRemove',
    table: 'block',
    id: block.parentId,
    args: { id: block.id },
    path: ['children']
  })

  if (previousBlock.children?.length) {
    operations.push({
      cmd: 'listAfter',
      table: 'block',
      id: previousId,
      args: { id: block.id, after: previousBlock.children[previousBlock.children.length - 1] },
      path: ['children']
    })
  } else {
    operations.push({
      cmd: 'listBefore',
      table: 'block',
      id: previousId,
      args: { id: block.id },
      path: ['children']
    })
  }
  parentId = previousId

  // list other blocks after first block
  let afterId = block.id
  for (const afterBlockId of blockIds.slice(1)) {
    operations.push({
      cmd: 'listRemove',
      table: 'block',
      id: parentBlock.id,
      args: { id: afterBlockId },
      path: ['children']
    })
    operations.push({
      cmd: 'listAfter',
      table: 'block',
      id: parentId,
      args: { id: afterBlockId, after: afterId },
      path: ['children']
    })
    afterId = afterBlockId
  }

  return operations
}

export const getOutdentionOperations = (blockId: string, parentBlock: Editor.BaseBlock, blockIds: string[]) => {
  const operations: Operation[] = []
  let parentId = ''

  operations.push({
    cmd: 'listRemove',
    table: 'block',
    id: parentBlock.id,
    args: { id: blockId },
    path: ['children']
  })
  operations.push({
    cmd: 'listAfter',
    table: 'block',
    id: parentBlock.parentId,
    args: { id: blockId, after: parentBlock.id },
    path: ['children']
  })

  parentId = parentBlock.parentId

  // list other blocks after first block
  let afterId = blockId
  for (const afterBlockId of blockIds.slice(1)) {
    operations.push({
      cmd: 'listRemove',
      table: 'block',
      id: parentBlock.id,
      args: { id: afterBlockId },
      path: ['children']
    })
    operations.push({
      cmd: 'listAfter',
      table: 'block',
      id: parentId,
      args: { id: afterBlockId, after: afterId },
      path: ['children']
    })
    afterId = afterBlockId
  }

  return operations
}

export const findPreviouseBlock = (
  blockId: string,
  parentBlockId: string,
  blockIds: string[],
  snapshot: BlockSnapshot
) => {
  const parentBlock = getBlockFromSnapshot(parentBlockId, snapshot)
  const peerBlockIds = parentBlock.children!
  const sourceIndex = peerBlockIds.findIndex((id) => id === blockId)

  if (sourceIndex !== undefined && sourceIndex >= 1 && blockIds.every((id) => parentBlock.children?.includes(id))) {
    const previousId = peerBlockIds[sourceIndex - 1]
    const previousBlock = getBlockFromSnapshot(previousId, snapshot)
    return previousBlock
  }
}

export const canOutdention = (parentBlock: Editor.BaseBlock, blockIds: string[]) => {
  return (
    blockIds.every((id) => parentBlock.children?.includes(id)) &&
    (parentBlock.type === Editor.BlockType.Story || parentBlock.type === Editor.BlockType.Thought) === false
  )
}

export const getDuplicatedBlocks = (blocks: Editor.BaseBlock[], storyId: string) => {
  const duplicatedBlocks = blocks.map((block) => {
    const fragBlock = block
    if (isQuestionLikeBlock(fragBlock.type)) {
      const questionBlock = fragBlock as Editor.QuestionBlock

      const newBlock = createEmptyBlock<Editor.QuestionBlock>({
        type: Editor.BlockType.Question,
        storyId,
        parentId: storyId,
        content: {
          title: questionBlock.content?.title,
          sql: questionBlock.content?.sql,
          visualization: questionBlock.content?.visualization,
          snapshotId: questionBlock.content?.snapshotId
        }
      })
      return newBlock
    } else {
      return createEmptyBlock({
        type: fragBlock.type,
        storyId,
        parentId: storyId,
        content: fragBlock.content,
        format: fragBlock.format
      })
    }
  })

  return duplicatedBlocks
}

export const insertBlockAfterTranscation = ({ block, after }: { block: Editor.Block; after?: string }) => {
  return createTranscation({
    operations: [
      { cmd: 'set', id: block.id, path: [], args: block, table: 'block' },
      after
        ? {
            cmd: 'listAfter',
            id: block.parentId,
            path: ['children'],
            table: 'block',
            args: {
              id: block.id,
              after: after
            }
          }
        : {
            cmd: 'listBefore',
            id: block.parentId,
            path: ['children'],
            table: 'block',
            args: {
              id: block.id
            }
          }
    ]
  })
}

export const addInsertBlockOperations = (
  blockIds: string[],
  targetParentBlockId: string,
  targetStoryId: string,
  operations: Operation[],
  snapshot: BlockSnapshot
) => {
  // const block = getBlockFromGlobalStore(blockId)
  const blocks = blockIds.map((id) => getBlockFromSnapshot(id, snapshot))
  const duplicatedBlocks = getDuplicatedBlocks(blocks, targetStoryId)
  let afterId = ''

  for (let i = 0; i < duplicatedBlocks.length; i++) {
    const block = duplicatedBlocks[i]
    if (!block) {
      toast.error('block is null')
    }
    invariant(block, 'block is null')
    operations.push({ cmd: 'set', id: block.id, path: [], args: block, table: 'block' })
    if (!afterId) {
      operations.push({
        cmd: 'listBefore',
        id: targetParentBlockId,
        args: {
          id: block.id
        },
        table: 'block',
        path: ['children']
      })
    } else {
      operations.push({
        cmd: 'listAfter',
        id: targetParentBlockId,
        args: {
          id: block.id,
          after: afterId
        },
        table: 'block',
        path: ['children']
      })
    }
    afterId = block.id

    addInsertBlockOperations(blocks[i].children ?? [], block.id, targetStoryId, operations, snapshot)
  }

  return operations
}

export const duplicateStoryTranscation = ({
  storyId,
  snapshot,
  newStoryId,
  wroskapceId
}: {
  storyId: string
  snapshot: BlockSnapshot
  newStoryId: string
  wroskapceId: string
}) => {
  const operations: Operation[] = []
  const story = getBlockFromSnapshot(storyId, snapshot)
  // const newStory = createEmptyBlock(story.type, storyId, story.parentId, fragBlock.content, fragBlock.format)
  operations.push({
    cmd: 'set',
    id: newStoryId,
    path: [],
    args: {
      id: newStoryId,
      alive: true,
      parentId: wroskapceId,
      parentTable: 'workspace',
      content: { ...story.content, title: mergeTokens([[`copy of `], ...(story.content?.title ?? [])]) },
      children: [],
      createdById: story.createdById,
      createdAt: story.createdAt,
      type: 'story',
      storyId: newStoryId,
      version: 0
    },
    table: 'block'
  })

  addInsertBlockOperations(story.children ?? [], newStoryId, newStoryId, operations, snapshot)
  // blocks.push(story)
  const transcation = createTranscation({ operations })

  return transcation as Transcation
}

const getMappedSnapshot = (snapshot: BlockSnapshot, mapper: (snapshot: BlockSnapshot) => void) => {
  const newSnapshot = new Map(snapshot)

  mapper(newSnapshot)
  return newSnapshot
}

export const insertBlocksAndMoveTranscation = ({
  blocks,
  targetBlockId,
  storyId,
  direction,
  duplicate = true,
  snapshot
}: {
  blocks: Editor.BaseBlock[]
  targetBlockId: string
  storyId: string
  direction: 'top' | 'left' | 'bottom' | 'right' | 'child'
  duplicate: boolean
  snapshot: BlockSnapshot
}) => {
  const operations: Operation[] = []

  const insertedBlocks = blocks

  if (duplicate) {
    for (const block of insertedBlocks) {
      operations.push({ cmd: 'set', id: block.id, path: [], args: block, table: 'block' })
    }
  }

  const newSnapshot = duplicate
    ? getMappedSnapshot(snapshot, (newSnapshot) => {
        for (const block of insertedBlocks) {
          newSnapshot.set(block.id, block)
        }
      })
    : snapshot

  operations.push(
    ...moveBlocksTranscation({
      sourceBlockIds: insertedBlocks.map((block) => block.id),
      targetBlockId,
      storyId,
      direction,
      deleteSourceBlock: false,
      snapshot: newSnapshot
    }).operations
  )
  return createTranscation({ operations })
}

export const moveBlocksTranscation = ({
  sourceBlockIds,
  targetBlockId,
  storyId,
  direction,
  deleteSourceBlock = true,
  snapshot
}: {
  sourceBlockIds: string[]
  targetBlockId: string
  storyId: string
  direction: 'top' | 'left' | 'bottom' | 'right' | 'child'
  deleteSourceBlock: boolean
  snapshot: BlockSnapshot
}) => {
  const operations: Operation[] = []
  const sourceBlocks = sourceBlockIds.map((id) => getBlockFromSnapshot(id, snapshot))
  const sourceBlock = cloneDeep(sourceBlocks[0])

  if (sourceBlocks.length === 1 && sourceBlock.id === targetBlockId) {
    invariant(false, 'illegal moveBlocksTranscation')
  }

  const targetBlock = getBlockFromSnapshot(targetBlockId, snapshot)
  let newSourceBlockParentId: string | null = null

  if (direction === 'top' || direction === 'bottom') {
    deleteSourceBlock &&
      operations.push(
        ...[
          {
            cmd: 'listRemove',
            id: getBlockFromSnapshot(sourceBlock.id, snapshot).parentId,
            path: ['children'],
            args: { id: sourceBlock.id },
            table: 'block'
          }
        ]
      )

    if (direction === 'top') {
      operations.push(
        ...[
          {
            cmd: 'listBefore',
            id: targetBlock.parentId,
            args: {
              id: sourceBlock.id,
              before: targetBlockId
            },
            table: 'block',
            path: ['children']
          }
        ]
      )
      // targetParentBlock.children!.splice(targetIndex, 0, sourceBlock.id)
    } else if (direction === 'bottom') {
      operations.push(
        ...[
          {
            cmd: 'listAfter',
            id: targetBlock.parentId,
            args: {
              id: sourceBlock.id,
              after: targetBlockId
            },
            table: 'block',
            path: ['children']
          }
        ]
      )
      // targetParentBlock.children!.splice(targetIndex + 1, 0, sourceBlock.id)
    }

    newSourceBlockParentId = targetBlock.parentId

    // sourceBlock.parentId = targetParentBlock.id
  } else if (direction === 'left' || direction === 'right') {
    if (targetBlock.type === Editor.BlockType.Column) {
      deleteSourceBlock &&
        operations.push(
          ...[
            {
              cmd: 'listRemove',
              id: getBlockFromSnapshot(sourceBlock.id, snapshot).parentId,
              path: ['children'],
              args: { id: sourceBlock.id },
              table: 'block'
            }
          ]
        )
      const newColumnBlock = createEmptyBlock({
        type: Editor.BlockType.Column,
        storyId,
        parentId: targetBlock.parentId
      })

      // newColumnBlock.children = [sourceBlock.id]
      operations.push(
        ...[
          {
            cmd: 'set',
            id: newColumnBlock.id,
            args: newColumnBlock,
            table: 'block',
            path: []
          }
        ]
      )
      operations.push(
        ...[
          {
            cmd: 'listBefore',
            id: newColumnBlock.id,
            args: {
              id: sourceBlock.id
            },
            table: 'block',
            path: ['children']
          }
        ]
      )
      if (direction === 'left') {
        operations.push(
          ...[
            {
              cmd: 'listBefore',
              id: targetBlock.parentId,
              args: {
                id: newColumnBlock.id,
                before: targetBlockId
              },
              table: 'block',
              path: ['children']
            }
          ]
        )
        // targetParentBlock.children?.splice(targetIndex, 0, newColumnBlock.id)
      } else if (direction === 'right') {
        operations.push(
          ...[
            {
              cmd: 'listAfter',
              id: targetBlock.parentId,
              args: {
                id: newColumnBlock.id,
                after: targetBlockId
              },
              table: 'block',
              path: ['children']
            }
          ]
        )
        // targetParentBlock.children?.splice(targetIndex + 1, 0, newColumnBlock.id)
      }
      newSourceBlockParentId = newColumnBlock.id

      // draft.blocksMap[newColumnBlock.id] = newColumnBlock
    } else {
      invariant(targetBlock.parentId === targetBlock.storyId, 'target block is not first class')
      invariant(targetBlock.type !== Editor.BlockType.Row, "row block can't be splited")
      console.log('create new grid row')
      const rowBlock = createEmptyBlock({ type: Editor.BlockType.Row, storyId, parentId: targetBlock.parentId })
      const columnBlockA = createEmptyBlock({ type: Editor.BlockType.Column, storyId, parentId: rowBlock.id })
      const columnBlockB = createEmptyBlock({ type: Editor.BlockType.Column, storyId, parentId: rowBlock.id })

      operations.push(
        ...[
          {
            cmd: 'set',
            id: rowBlock.id,
            args: cloneDeep(rowBlock),
            table: 'block',
            path: []
          }
        ]
      )

      operations.push(
        ...[
          {
            cmd: 'listAfter',
            id: targetBlock.parentId,
            args: {
              id: rowBlock.id,
              after: targetBlockId
            },
            table: 'block',
            path: ['children']
          }
        ]
      )

      deleteSourceBlock &&
        operations.push(
          ...[
            {
              cmd: 'listRemove',
              id: getBlockFromSnapshot(sourceBlock.id, snapshot).parentId,
              path: ['children'],
              args: { id: sourceBlock.id },
              table: 'block'
            }
          ]
        )
      operations.push(
        ...[
          {
            cmd: 'listRemove',
            id: getBlockFromSnapshot(targetBlock.id, snapshot).parentId,
            path: ['children'],
            args: { id: targetBlock.id },
            table: 'block'
          }
        ]
      )

      operations.push(
        ...[
          {
            cmd: 'set',
            id: columnBlockA.id,
            args: cloneDeep(columnBlockA),
            table: 'block',
            path: []
          }
        ]
      )
      operations.push(
        ...[
          {
            cmd: 'set',
            id: columnBlockB.id,
            args: cloneDeep(columnBlockB),
            table: 'block',
            path: []
          }
        ]
      )

      operations.push(
        ...[
          {
            cmd: 'listBefore',
            id: rowBlock.id,
            args: { id: columnBlockA.id },
            table: 'block',
            path: ['children']
          }
        ]
      )

      operations.push(
        ...[
          {
            cmd: 'listAfter',
            id: rowBlock.id,
            args: { id: columnBlockB.id, after: columnBlockA.id },
            table: 'block',
            path: ['children']
          }
        ]
      )

      if (direction === 'left') {
        operations.push(
          ...[
            {
              cmd: 'listBefore',
              id: columnBlockA.id,
              args: { id: sourceBlock.id },
              table: 'block',
              path: ['children']
            }
          ]
        )
        operations.push(
          ...[
            {
              cmd: 'listBefore',
              id: columnBlockB.id,
              args: { id: targetBlock.id },
              table: 'block',
              path: ['children']
            }
          ]
        )
        newSourceBlockParentId = columnBlockA.id
      } else if (direction === 'right') {
        operations.push(
          ...[
            {
              cmd: 'listBefore',
              id: columnBlockA.id,
              args: { id: targetBlock.id },
              table: 'block',
              path: ['children']
            }
          ]
        )
        operations.push(
          ...[
            {
              cmd: 'listBefore',
              id: columnBlockB.id,
              args: { id: sourceBlock.id },
              table: 'block',
              path: ['children']
            }
          ]
        )
        newSourceBlockParentId = columnBlockB.id
      }
    }
  } else if (direction === 'child') {
    operations.push(
      ...[
        {
          cmd: 'listBefore',
          id: targetBlockId,
          args: { id: sourceBlock.id },
          table: 'block',
          path: ['children']
        }
      ]
    )

    newSourceBlockParentId = targetBlockId
  }

  // ...and just place other blocks next to the first block
  const parentId = newSourceBlockParentId
  let afterId = sourceBlocks[0].id
  cloneDeep(sourceBlocks)
    .slice(1)
    .forEach((block) => {
      invariant(parentId, 'parent id is null')
      if (deleteSourceBlock) {
        operations.push({
          cmd: 'listRemove',
          id: getBlockFromSnapshot(block.id, snapshot).parentId,
          path: ['children'],
          args: { id: block.id },
          table: 'block'
        })
      }
      operations.push(
        ...[
          {
            cmd: 'listAfter',
            id: parentId,
            args: {
              id: block.id,
              after: afterId
            },
            table: 'block',
            path: ['children']
          }
        ]
      )
      afterId = block.id
    })

  console.log('moveblock operations', operations)
  return createTranscation({ operations })
}

export const insertBlocksTranscation = ({ blocks, after }: { blocks: Editor.Block[]; after: string }) => {
  const operations: Operation[] = []
  let afterId = after
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    operations.push({ cmd: 'set', id: block.id, path: [], args: block, table: 'block' })
    operations.push({
      cmd: 'listAfter',
      id: block.parentId,
      path: ['children'],
      table: 'block',
      args: {
        id: block.id,
        after: afterId
      }
    })
    afterId = block.id
  }
  return createTranscation({ operations })
}

export const setBlockTitleTranscation = ({
  oldBlock,
  newBlock
}: {
  oldBlock: Editor.Block
  newBlock: Editor.Block
}) => {
  const operations: Operation[] = []
  const id = oldBlock.id
  if (dequal(oldBlock.content?.title, newBlock.content?.title) === false) {
    operations.push({
      cmd: 'update',
      path: ['content', 'title'],
      args: newBlock.content?.title,
      table: 'block',
      id: id
    })
  }
  return createTranscation({ operations })
}

export const setBlockTranscation = ({ oldBlock, newBlock }: { oldBlock: Editor.Block; newBlock: Editor.Block }) => {
  const operations: Operation[] = []
  const id = oldBlock.id
  if (dequal(oldBlock.content, newBlock.content) === false) {
    operations.push({
      cmd: 'set',
      path: ['content'],
      args: newBlock.content,
      table: 'block',
      id: id
    })
  }
  if (dequal(oldBlock.format, newBlock.format) === false) {
    operations.push({
      cmd: 'set',
      path: ['format'],
      args: newBlock.format,
      table: 'block',
      id: id
    })
  }
  if (dequal(oldBlock.type, newBlock.type) === false) {
    operations.push({
      cmd: 'update',
      path: ['type'],
      args: newBlock.type,
      table: 'block',
      id: id
    })
  }
  return createTranscation({ operations })
}
