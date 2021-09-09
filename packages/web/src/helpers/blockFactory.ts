import { DEFAULT_QUESTION_BLOCK_ASPECT_RATIO, DEFAULT_QUESTION_BLOCK_WIDTH } from '@app/components/editor/utils'
import { Editor } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { cloneDeep } from 'lodash'

export const useCreateEmptyBlock = () => {
  return <T extends Editor.BaseBlock = Editor.BaseBlock>(args: Partial<T>) => {
    const block = createEmptyBlock({
      ...args
    })
    return block as T
  }
}

export const createEmptyBlock = <T extends Editor.BaseBlock = Editor.BaseBlock>(args: Partial<T>) => {
  const id = args?.id ?? blockIdGenerator()
  const now = new Date().valueOf()
  const commonParts = {
    id,
    alive: true,
    content: cloneDeep(args.content) || { title: [] },
    type: args.type,
    format: args?.format ?? {},
    children: args?.children ?? [],
    storyId: args.storyId,
    parentTable: args.parentTable ?? Editor.BlockParentType.BLOCK,
    parentId: args?.parentId,
    updatedAt: now,
    createdAt: now,
    // TODO: implement default permissions
    permissions: args.permissions,
    version: 0
  } as unknown as T

  switch (args.type) {
    case Editor.BlockType.Visualization: {
      return {
        ...commonParts,
        ...{
          content: {
            ...commonParts.content
          },
          format: {
            width: DEFAULT_QUESTION_BLOCK_WIDTH,
            aspectRatio: DEFAULT_QUESTION_BLOCK_ASPECT_RATIO,
            ...args.format
          }
        }
      }
    }
    default: {
      return commonParts
    }
  }
}

export const createDeletedBlock = (id: string) => {
  return {
    alive: false,
    resourceType: 'block',
    content: { title: [['Deleted']] },
    id: id,
    version: 0,
    updatedAt: new Date().valueOf(),
    createdAt: new Date().valueOf(),
    type: 'text',
    parentId: id,
    permissions: [],
    parentTable: Editor.BlockParentType.BLOCK
  } as Editor.BaseBlock
}
