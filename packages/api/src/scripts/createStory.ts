
import { nanoid } from 'nanoid'
import { getRepository } from 'typeorm'
import { createDatabaseCon } from '../clients/db/orm'
import { WorkspaceView } from '../core/workspaceView'
import { UserEntity } from '../entities/user'
import { WorkspaceEntity } from '../entities/workspace'

const transformBlock = (block: any, userId: string, worksapceId: string) => {
  if (block.type === 'story') {
    return {
      ...block,
      parentId: worksapceId,
      createdById: userId,
      lastEditedById: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    }
  } else {
    return {
      ...block,
      children: [],
      createdById: userId,
      lastEditedById: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    }
  }
}

const generateOperationsFromStoryChunk = ({
  blocks,
  rootId,
  userId,
  workspaceId
}: {
  blocks: any
  rootId: any
  userId: string
  workspaceId: string
}): any[] => {
  const operations = []

  const rootBlock = blocks[rootId]

  operations.push({
    cmd: 'set',
    args: transformBlock(rootBlock, userId, workspaceId),
    path: [],
    table: 'block',
    id: rootBlock.id
  })

  if (rootBlock.children && rootBlock.children.length) {
    let afterId = null
    for (let i = 0; i < rootBlock.children.length; i++) {
      const childBlockId = rootBlock.children[i]
      const childBlock = blocks[childBlockId]
      operations.push(...generateOperationsFromStoryChunk({ blocks, rootId: childBlock.id, userId, workspaceId }))
      if (afterId) {
        operations.push({
          cmd: 'listBefore',
          path: ['children'],
          table: 'block',
          id: rootBlock.id,
          args: {
            id: childBlockId,
            breforeId: undefined
          }
        })
      } else {
        operations.push({
          cmd: 'listAfter',
          path: ['children'],
          table: 'block',
          id: rootBlock.id,
          args: {
            id: childBlockId,
            afterId: afterId
          }
        })
      }
      afterId = childBlock.id
    }
  }

  return operations
}

const generateCreateStoryTranscation = (props: { blocks: any; rootId: any; userId: string; workspaceId: string }) => {
  return {
    id: nanoid(),
    operations: generateOperationsFromStoryChunk(props),
    workspaceId: props.workspaceId
  }
}

const generatePinStoryTranscation = ({
  workspaceId,
  workspaceViewId,
  storyId
}: {
  workspaceId: string
  workspaceViewId: string
  storyId: string
}) => {
  return {
    id: nanoid(),
    operations: [
      {
        cmd: 'listBefore',
        table: 'workspaceView',
        id: workspaceViewId,
        args: {
          id: storyId
        },
        path: ['pinnedList']
      }
    ],
    workspaceId: workspaceId
  }
}

const main = async () => {
  const storyId = ''

  await createDatabaseCon()

  const workspace = await getRepository(WorkspaceEntity).findOne()
  const superUser = await getRepository(UserEntity).findOne()
  const workspaceView = await getRepository(WorkspaceView).findOne()

  if(!superUser || !workspace || !workspaceView) {
    throw new Error('there is no user or workspace or workspaceview, please create first')
  }

  const workspaceId = workspace.id
  const userId = superUser.id

  const createStoryTranscation = generateCreateStoryTranscation({
    blocks: {},
    rootId: storyId,
    userId: userId,
    workspaceId: workspaceId
  })

  const createPinStoryTranscation = generatePinStoryTranscation({
    workspaceId: workspaceId,
    workspaceViewId: workspaceView.id,
    storyId: storyId
  })

}

