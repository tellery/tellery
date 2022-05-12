import { DEFAULT_QUESTION_BLOCK_ASPECT_RATIO, DEFAULT_QUESTION_BLOCK_WIDTH } from '@app/components/editor/utils'
import { BlockPermissionsAtom } from '@app/store/block'
import { Editor } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { cloneDeep } from 'lodash'
import { useCallback } from 'react'
import { useRecoilValue } from 'recoil'

export const useCreateEmptyBlock = () => {
  const handler = useCallback(<T extends Editor.BaseBlock = Editor.BaseBlock>(args: Partial<T>) => {
    const block = createEmptyBlock({
      ...args
    })
    return block as T
  }, [])
  return handler
}

export const DEFAULT_VISULIZATION_FORMAT = {
  width: DEFAULT_QUESTION_BLOCK_WIDTH,
  aspectRatio: DEFAULT_QUESTION_BLOCK_ASPECT_RATIO
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
    case Editor.BlockType.Control: {
      const controlBlock = commonParts as unknown as Editor.ControlBlock
      const getDefaultValue = (controlType: string) => {
        if (controlType === 'text') return ''
        if (controlType === 'number') return 1
        if (controlType === 'date') return new Date()
      }
      return {
        ...commonParts,
        ...{
          content: {
            name: id,
            ...commonParts.content,
            defaultValue: getDefaultValue(controlBlock.content.type)
          },
          format: {
            ...DEFAULT_VISULIZATION_FORMAT,
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

export const useCreateEmptyBlockWithDefaultPermissions = (storyId: string) => {
  const storyPermissions = useRecoilValue(BlockPermissionsAtom(storyId))
  const createEmptyBlockWithPermissions = useCallback(
    <T extends Editor.BaseBlock = Editor.BaseBlock>(args: Partial<T>) => {
      return createEmptyBlock({ ...args, permissions: storyPermissions })
    },
    [storyPermissions]
  )
  return createEmptyBlockWithPermissions
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
