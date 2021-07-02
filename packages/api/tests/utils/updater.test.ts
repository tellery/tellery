import '../../src/core/block/init'

import test from 'ava'

import { Block } from '../../src/core/block'
import { TextBlock } from '../../src/core/block/text'
import { BlockParentType, BlockType } from '../../src/types/block'
import { removeByPathAndId, setByPath } from '../../src/utils/updater'

test('setByPath-noPath', (t) => {
  const block = new TextBlock('testId', 'xxx', BlockParentType.BLOCK, 'testStoryId', {}, true, 0)

  setByPath(
    block,
    [],
    {
      id: 'newId',
      parentId: 'newStoryId',
      parentTable: 'block',
      storyId: 'newStoryId',
      type: BlockType.TEXT,
      content: {},
    },
    (args) => {
      const newBlock = Block.fromArgs(args)
      Object.assign(block, newBlock)
    },
  )

  t.deepEqual(block.id, 'newId')
  t.deepEqual(block.storyId, 'newStoryId')
  t.deepEqual(block.parentId, 'newStoryId')
  t.deepEqual(block.parentTable, BlockParentType.BLOCK)
  t.deepEqual(block.content, {})
})

test('removeByPathAndId-pathValIsMapOrObj', (t) => {
  // string
  const block1 = new TextBlock(
    'xxx',
    'xxx',
    BlockParentType.BLOCK,
    'xxx',
    {
      field: [{ id: 'field1' }, { id: 'field2' }, { id: 'field3' }],
    },
    true,
    0,
  )
  removeByPathAndId(block1, ['content', 'field'], 'field2')

  t.deepEqual(block1.content, { field: [{ id: 'field1' }, { id: 'field3' }] })

  const block2 = new TextBlock(
    'xxx',
    'xxx',
    BlockParentType.BLOCK,
    'xxx',
    {
      field: [{ id: 'field1' }, { id: 'field2' }],
    },
    true,
    0,
  )
  removeByPathAndId(block2, ['content', 'field'], 'field2')

  t.deepEqual(block2.content, { field: [{ id: 'field1' }] })
})

test('removeByPathAndId-pathValIsArray', (t) => {
  // string
  const block1 = new TextBlock(
    'xxx',
    'xxx',
    BlockParentType.BLOCK,
    'xxx',
    {
      field: ['field1', 'field2', 'field3'],
    },
    true,
    0,
  )
  removeByPathAndId(block1, ['content', 'field'], 'field2')

  t.deepEqual(block1.content, { field: ['field1', 'field3'] })

  const block2 = new TextBlock(
    'xxx',
    'xxx',
    BlockParentType.BLOCK,
    'xxx',
    {
      field: [{ id: 'field1' }, { id: 'field2' }],
    },
    true,
    0,
  )
  removeByPathAndId(block2, ['content', 'field'], 'field2')

  t.deepEqual(block2.content, { field: [{ id: 'field1' }] })
})

test('removeByPathAndId-pathValIsIgnored', (t) => {
  // path val is null
  const block1 = new TextBlock(
    'xxx',
    'xxx',
    BlockParentType.BLOCK,
    'xxx',
    {
      field: ['field1', 'field2', 'field3'],
    },
    true,
    0,
  )
  removeByPathAndId(block1, ['content', 'field1'], 'field2')

  t.deepEqual(block1.content, { field: ['field1', 'field2', 'field3'] })
})
