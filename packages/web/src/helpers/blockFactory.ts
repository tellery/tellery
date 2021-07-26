import { DEFAULT_QUESTION_BLOCK_ASPECT_RATIO, DEFAULT_QUESTION_BLOCK_WIDTH } from '@app/components/editor/utils'
import { cloneDeep } from 'lodash'
import { nanoid } from 'nanoid'
import { Editor } from '@app/types'

export const useCreateEmptyBlock = () => {
  return <T extends Editor.BaseBlock = Editor.BaseBlock>(args: Partial<T>) => {
    const block = createEmptyBlock({
      ...args
    })
    return block as T
  }
}

export const createEmptyBlock = <T extends Editor.BaseBlock = Editor.BaseBlock>(args: Partial<T>) => {
  const id = args?.id ?? nanoid()
  const now = new Date().valueOf()
  const commonParts = {
    id,
    alive: true,
    content: cloneDeep(args.content) || { title: [] },
    type: args.type,
    format: args?.format ?? {},
    children: [],
    storyId: args.storyId,
    parentTable: args.parentTable ?? Editor.BlockParentType.BLOCK,
    parentId: args?.parentId,
    updatedAt: now,
    createdAt: now,
    // TODO: implement default permissions
    permissions: args.permissions ?? [{ role: 'manager', type: 'workspace' }],
    version: 0
  } as unknown as T

  switch (args.type) {
    case Editor.BlockType.Question: {
      return {
        ...commonParts,
        ...{
          content: {
            sql: (args as Editor.QuestionBlock).content?.sql ?? '',
            ...commonParts.content
          },
          format: {
            width: DEFAULT_QUESTION_BLOCK_WIDTH,
            aspectRatio: DEFAULT_QUESTION_BLOCK_ASPECT_RATIO
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
    version: 0
  } as Editor.BaseBlock
}
