import test from 'ava'
import _ from 'lodash'

import { getBlockConstructor, register } from '../../../src/core/block'
import { BulletedListBlock } from '../../../src/core/block/bulletedList'
import { CalloutBlock } from '../../../src/core/block/callout'
import { CodeBlock } from '../../../src/core/block/code'
import { Heading1Block } from '../../../src/core/block/heading1'
import { Heading2Block } from '../../../src/core/block/heading2'
import { Heading3Block } from '../../../src/core/block/heading3'
import { NumberListBlock } from '../../../src/core/block/numberList'
import { QuoteBlock } from '../../../src/core/block/quote'
import { TextBlock } from '../../../src/core/block/text'
import { TODOBlock } from '../../../src/core/block/todo'
import { ToggleBlock } from '../../../src/core/block/toggle'
import { BlockParentType, BlockType } from '../../../src/types/block'
import { LinkType } from '../../../src/types/link'

const textBlockMap = {
  [BlockType.TEXT]: TextBlock,
  [BlockType.HEADING_1]: Heading1Block,
  [BlockType.HEADING_2]: Heading2Block,
  [BlockType.HEADING_3]: Heading3Block,
  [BlockType.CALLOUT]: CalloutBlock,
  [BlockType.NUMBERED_LIST]: NumberListBlock,
  [BlockType.BULLETED_LIST]: BulletedListBlock,
  [BlockType.QUOTE]: QuoteBlock,
  [BlockType.CODE]: CodeBlock,
  [BlockType.TODO]: TODOBlock,
  [BlockType.TOGGLE]: ToggleBlock,
}

test.before(() => {
  _(textBlockMap).forEach((c, t) => register(t as BlockType, c))
})

test('setContentByPath without path', (t) => {
  const block = new TextBlock('testId', 'xxx', BlockParentType.BLOCK, 'testStoryId', {}, true, 0)

  block.setContentByPath([], {
    id: 'newId',
    storyId: 'newStoryId',
    parentId: 'newStoryId',
    parentTable: BlockParentType.BLOCK,
    type: BlockType.TEXT,
    content: {},
  })

  t.deepEqual(block.id, 'newId')
  t.deepEqual(block.storyId, 'newStoryId')
  t.deepEqual(block.content, {})
})

test('setContentByPath with string', (t) => {
  const block = new TextBlock(
    'xxx',
    'xxx',
    BlockParentType.BLOCK,
    'xxx',
    {
      field1: 'field1',
    },
    true,
    0,
  )

  block.setContentByPath(['content', 'field1'], 'newField1')

  t.deepEqual(block.content, {
    field1: 'newField1',
  })
})

test('setContentByPath with map', async (t) => {
  const block = new TextBlock(
    'xxx',
    'xxx',
    BlockParentType.BLOCK,
    'xxx',
    {
      field1: 'field1',
    },
    true,
    0,
  )

  block.setContentByPath(['content'], {
    newField1: 'newField1',
  })

  t.deepEqual(block.content, {
    newField1: 'newField1',
  })
})

test('removeContentByPathAndId with map or obj', (t) => {
  const block = new TextBlock(
    'xxx',
    'xxx',
    BlockParentType.BLOCK,
    'xxx',
    {
      field1: {
        testId1: 'xxx',
      },
    },
    true,
    0,
  )
  block.removeContentByPathAndId(['content', 'field1'], 'testId1')

  t.deepEqual(block.content, { field1: {} })
})

test('removeContentByPathAndId with string array', (t) => {
  const block = new TextBlock(
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
  block.removeContentByPathAndId(['content', 'field'], 'field2')

  t.deepEqual(block.content, { field: ['field1', 'field3'] })
})

test('removeContentByPathAndId with obj array', async (t) => {
  const block = new TextBlock(
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
  block.removeContentByPathAndId(['content', 'field'], 'field2')

  t.deepEqual(block.content, { field: [{ id: 'field1' }] })
})

test('getTextBlockLinks', (t) => {
  _(textBlockMap)
    .keys()
    .forEach((type) => {
      const block = new (getBlockConstructor(type as BlockType))(
        'id',
        'xxx',
        BlockParentType.BLOCK,
        'id',
        { title: [['heading'], ['‣', [['r', 's', 'Gjep4HtlKjcGAxFzOZGnN']]]], format: {} },
        true,
        0,
      )

      const links = block.getLinksFromContent()
      t.deepEqual(links, [{ blockId: 'Gjep4HtlKjcGAxFzOZGnN', type: LinkType.BLOCK }])
    })
})
