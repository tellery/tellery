import { createEmptyBlock } from '@app/helpers/blockFactory'
import type { Operation, Transcation } from '@app/hooks/useCommit'
import { BlockSnapshot, getBlockFromSnapshot } from '@app/store/block'
import { Editor } from '@app/types'
import { addPrefixToBlockTitle, blockIdGenerator } from '@app/utils'
import dayjs from 'dayjs'
import { dequal } from 'dequal'
import { cloneDeep } from 'lodash'
import { toast } from 'react-toastify'
import invariant from 'tiny-invariant'

export const createTranscation = ({ operations }: { operations: Operation[] }) => {
  return {
    id: blockIdGenerator(),
    operations
  }
}

export const getIndentionOperations = (
  block: Editor.BaseBlock,
  previousBlock: Editor.BaseBlock,
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

export const getDuplicatedBlocksFragment = (
  children: string[],
  data: Record<string, Editor.BaseBlock>,
  storyId: string | undefined,
  parentId: string | undefined,
  blockMapping: Record<string, string> = {}
) => {
  let result: Record<string, Editor.BaseBlock> = {}
  children.forEach((currentId) => {
    const currentBlock = data[currentId]
    const newId = blockIdGenerator()
    const fragment = getDuplicatedBlocksFragment(currentBlock.children ?? [], data, storyId, newId, blockMapping)
    let newBlock = null
    if (currentBlock.type === Editor.BlockType.Visualization) {
      const vizBlock = currentBlock as Editor.VisualizationBlock
      newBlock = createEmptyBlock<Editor.VisualizationBlock>({
        type: vizBlock.type,
        id: newId,
        storyId,
        parentId: parentId,
        content: {
          ...vizBlock.content,
          fromQueryId: vizBlock.content?.queryId,
          queryId: vizBlock.content?.queryId
            ? blockMapping[vizBlock.content.queryId] ?? vizBlock.content?.queryId
            : undefined
        },
        children: fragment.children,
        format: vizBlock.format
      })
    } else {
      newBlock = createEmptyBlock({
        type: currentBlock.type,
        id: newId,
        storyId,
        parentId: parentId,
        content: currentBlock.content,
        children: fragment.children,
        format: currentBlock.format
      })
    }
    result[newId] = newBlock
    result = { ...result, ...fragment.data }
    blockMapping[currentId] = newId
  })

  return {
    children: children.map((id) => blockMapping[id]),
    data: result
  }
}

export const getDuplicatedBlocks = (
  blocks: Editor.BaseBlock[],
  storyId: string,
  snapshot: BlockSnapshot,
  resourceMapping?: Record<string, string>
) => {
  const duplicatedBlocks = blocks.map((block) => {
    if (block.type === Editor.BlockType.Visualization) {
      const fragBlock = block as Editor.VisualizationBlock
      const originalQueryId = fragBlock.content?.queryId
      if (originalQueryId) {
        const queryBlock = getBlockFromSnapshot(originalQueryId, snapshot)
        const isStoryQuery = queryBlock.storyId === block.storyId
        if (isStoryQuery && resourceMapping && resourceMapping[originalQueryId] === undefined) {
          const newId = blockIdGenerator()
          resourceMapping[originalQueryId] = newId
        }
      }
      const newId = originalQueryId ? resourceMapping?.[originalQueryId] ?? originalQueryId : undefined
      return createEmptyBlock<Editor.VisualizationBlock>({
        type: fragBlock.type,
        storyId,
        parentId: storyId,
        content: {
          ...fragBlock.content,
          queryId: newId,
          fromQueryId: originalQueryId
        },
        children: [],
        format: fragBlock.format
      })
    } else {
      const fragBlock = block
      const newBlock = createEmptyBlock({
        type: fragBlock.type,
        storyId,
        parentId: storyId,
        content: fragBlock.content,
        children: fragBlock.children,
        format: fragBlock.format
      })
      if (resourceMapping?.[fragBlock.id]) {
        newBlock.id = resourceMapping[fragBlock.id]
      }
      return newBlock
    }
  })

  return duplicatedBlocks
}

export const insertBlockAfterTranscation = ({ block, after }: { block: Editor.BaseBlock; after?: string }) => {
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
  snapshot: BlockSnapshot,
  resourceMapping?: Record<string, string>
) => {
  // const block = getBlockFromGlobalStore(blockId)
  const blocks = blockIds.map((id) => getBlockFromSnapshot(id, snapshot))
  const duplicatedBlocks = getDuplicatedBlocks(blocks, targetStoryId, snapshot, resourceMapping)
  let afterId = ''

  for (let i = 0; i < duplicatedBlocks.length; i++) {
    const block = duplicatedBlocks[i]
    if (!block) {
      toast.error('block is null')
    }
    invariant(block, 'block is null')
    operations.push({
      cmd: 'set',
      id: block.id,
      path: [],
      args: { ...block, parentId: targetParentBlockId, children: [] },
      table: 'block'
    })
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

    addInsertBlockOperations(blocks[i].children ?? [], block.id, targetStoryId, operations, snapshot, resourceMapping)
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
  const resourceMapping: Record<string, string> = {}

  operations.push({
    cmd: 'set',
    id: newStoryId,
    path: [],
    args: createEmptyBlock({
      id: newStoryId,
      alive: true,
      parentId: wroskapceId,
      parentTable: Editor.BlockParentType.WORKSPACE,
      content: { ...story.content, title: addPrefixToBlockTitle(story.content?.title, 'copy of ') },
      children: [],
      type: Editor.BlockType.Story,
      storyId: newStoryId,
      format: { ...story.format },
      permissions: [{ role: 'manager', type: 'workspace' }]
    }),
    table: 'block'
  })

  addInsertBlockOperations(story.children ?? [], newStoryId, newStoryId, operations, snapshot, resourceMapping)
  // blocks.push(story)
  const transcation = createTranscation({ operations })

  return transcation as Transcation
}

export const removeBlocksOperations = (targetBlocks: Editor.Block[], storyId: string) => {
  const operations: Operation[] = []
  targetBlocks.forEach((targetBlock) => {
    operations.push(
      ...[
        {
          cmd: 'listRemove',
          id: targetBlock.parentId,
          path: ['children'],
          args: { id: targetBlock.id },
          table: 'block'
        }
      ]
    )
    if (storyId === targetBlock.storyId) {
      operations.push({
        cmd: 'update',
        id: targetBlock.id,
        path: ['alive'],
        args: false,
        table: 'block'
      })
    }
  })
  return operations
}

export const insertBlocksAndMoveOperations = ({
  blocksFragment,
  targetBlock,
  storyId,
  direction,
  path = 'children'
}: {
  blocksFragment: { children: string[]; data: Record<string, Editor.BaseBlock> }
  targetBlock: Editor.Block
  storyId: string
  direction: 'top' | 'left' | 'bottom' | 'right' | 'child'
  path?: 'children'
}) => {
  const operations: Operation[] = []

  const insertedBlocks = Object.values(blocksFragment.data)

  for (const block of insertedBlocks) {
    operations.push({ cmd: 'set', id: block.id, path: [], args: block, table: 'block' })
  }

  operations.push(
    ...moveBlocksTranscation({
      sourceBlockFragment: blocksFragment,
      targetBlock: targetBlock,
      storyId,
      direction,
      deleteSourceBlock: false,
      path
    }).operations
  )
  return operations
}

export const createThoughtTranscation = ({
  id,
  workspaceId,
  userId
}: {
  id: string
  workspaceId: string
  userId: string
}) => {
  return createTranscation({
    operations: [
      {
        cmd: 'set',
        id: id,
        path: [],
        table: 'block',
        args: {
          id: id,
          alive: true,
          parentId: workspaceId, // workspaceId
          parentTable: 'workspace',
          content: { date: dayjs().format('YYYY-MM-DD') },
          children: [],
          permissions: [{ role: 'manager', type: 'user', id: userId }],
          type: 'thought',
          storyId: id,
          version: 0
        }
      }
    ]
  })
}

export const moveBlocksTranscation = ({
  sourceBlockFragment,
  targetBlock,
  storyId,
  direction,
  deleteSourceBlock = true,
  path = 'children'
}: {
  sourceBlockFragment: { children: string[]; data: Record<string, Editor.Block> }
  targetBlock: Editor.Block
  storyId: string
  direction: 'top' | 'left' | 'bottom' | 'right' | 'child'
  deleteSourceBlock: boolean
  path?: 'children'
}) => {
  const operations: Operation[] = []
  const leadingSourceBlockId = sourceBlockFragment.children[0]!
  const leadingSourceBlock = sourceBlockFragment.data[leadingSourceBlockId]
  const targetBlockId = targetBlock.id

  if (leadingSourceBlockId === targetBlockId) {
    invariant(false, 'illegal moveBlocksTranscation')
  }

  let newSourceBlockParentId: string | null = null

  if (direction === 'top' || direction === 'bottom') {
    deleteSourceBlock &&
      operations.push(
        ...[
          {
            cmd: 'listRemove',
            id: leadingSourceBlock.parentId,
            path: [path],
            args: { id: leadingSourceBlockId },
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
              id: leadingSourceBlockId,
              before: targetBlockId
            },
            table: 'block',
            path: [path]
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
              id: leadingSourceBlockId,
              after: targetBlockId
            },
            table: 'block',
            path: [path]
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
              id: leadingSourceBlock.parentId,
              path: [path],
              args: { id: leadingSourceBlockId },
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
              id: leadingSourceBlockId
            },
            table: 'block',
            path: [path]
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
              path: [path]
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
              path: [path]
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
            path: [path]
          }
        ]
      )

      deleteSourceBlock &&
        operations.push(
          ...[
            {
              cmd: 'listRemove',
              id: leadingSourceBlock.parentId,
              path: [path],
              args: { id: leadingSourceBlockId },
              table: 'block'
            }
          ]
        )
      operations.push(
        ...[
          {
            cmd: 'listRemove',
            id: targetBlock.parentId,
            path: [path],
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
            path: [path]
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
            path: [path]
          }
        ]
      )

      if (direction === 'left') {
        operations.push(
          ...[
            {
              cmd: 'listBefore',
              id: columnBlockA.id,
              args: { id: leadingSourceBlockId },
              table: 'block',
              path: [path]
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
              path: [path]
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
              path: [path]
            }
          ]
        )
        operations.push(
          ...[
            {
              cmd: 'listBefore',
              id: columnBlockB.id,
              args: { id: leadingSourceBlockId },
              table: 'block',
              path: [path]
            }
          ]
        )
        newSourceBlockParentId = columnBlockB.id
      }
    }
  } else if (direction === 'child') {
    deleteSourceBlock &&
      operations.push(
        ...[
          {
            cmd: 'listRemove',
            id: leadingSourceBlock.parentId,
            path: [path],
            args: { id: leadingSourceBlockId },
            table: 'block'
          }
        ]
      )
    operations.push(
      ...[
        {
          cmd: 'listBefore',
          id: targetBlockId,
          args: { id: leadingSourceBlockId },
          table: 'block',
          path: [path]
        }
      ]
    )

    newSourceBlockParentId = targetBlockId
  }

  // ...and just place other blocks next to the first block
  const parentId = newSourceBlockParentId
  let afterId = leadingSourceBlockId
  sourceBlockFragment.children.slice(1).forEach((blockId) => {
    invariant(parentId, 'parent id is null')
    const block = sourceBlockFragment.data[blockId]
    if (deleteSourceBlock) {
      operations.push({
        cmd: 'listRemove',
        id: block.parentId,
        path: [path],
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
          path: [path]
        }
      ]
    )
    afterId = block.id
  })

  return createTranscation({ operations })
}

export const insertBlocksTranscation = ({ blocks, after }: { blocks: Editor.BaseBlock[]; after: string }) => {
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
  oldBlock: Editor.BaseBlock
  newBlock: Editor.BaseBlock
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

export const setBlockOperations = <T extends Editor.BaseBlock>({
  oldBlock,
  newBlock
}: {
  oldBlock: T
  newBlock: T
}) => {
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
  return operations
}

export const setBlockTranscation = <T extends Editor.BaseBlock>({
  oldBlock,
  newBlock
}: {
  oldBlock: T
  newBlock: T
}) => {
  return createTranscation({ operations: setBlockOperations({ oldBlock, newBlock }) })
}
