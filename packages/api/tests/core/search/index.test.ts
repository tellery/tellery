import '../../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection, getRepository } from 'typeorm'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { BlockOperation } from '../../../src/core/block/operation'
import { getISearch } from '../../../src/core/search/interface'
import BlockEntity from '../../../src/entities/block'
import { UserEntity } from '../../../src/entities/user'
import { BlockParentType, BlockType } from '../../../src/types/block'
import { set, update, uuid } from '../../testutils'

test.before(async () => {
  await createDatabaseCon()
})

test('searchUsers', async (t) => {
  // test non-english words
  const user = await getRepository(UserEntity).save({
    username: '用户domchan',
    email: `test@email.com${nanoid()}`,
    avatar: 'test',
    password: nanoid(),
  })

  const iSearch = getISearch()
  const res0 = await iSearch.searchUsers('用')
  const r0 = _(res0).find((r) => _(r.hint).get('id') === user.id)
  t.not(res0.length, 0)
  t.not(r0, undefined)

  const res1 = await iSearch.searchUsers('tes')
  const r1 = _(res1).find((r) => _(r.hint).get('id') === user.id)
  t.not(res1.length, 0)
  t.not(r1, undefined)
})

test('searchStories', async (t) => {
  const id = nanoid()

  await getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    // test non-english words
    const title = `这是一个用来测试的Story,${nanoid()}`
    const newTitle = `这是一个用来测试的Story,${nanoid()}`
    await set(
      op,
      id,
      {
        id,
        parentId: 'test',
        parentTable: BlockParentType.WORKSPACE,
        storyId: id,
        type: BlockType.STORY,
        content: { title: [[title]] },
        children: ['oid'],
        alive: true,
      },
      [],
    )

    await update(op, id, newTitle, ['title'])
  })

  const iSearch = getISearch()

  // all
  const res0 = await iSearch.searchBlocks('', {
    query: (tab) => `${tab}.type = :story`,
    parameters: { story: 'story' },
  })
  t.not(res0.length, 0)
  // English word cutting
  const res1 = await iSearch.searchBlocks('story', {
    query: (tab) => `${tab}.type = :story`,
    parameters: { story: 'story' },
  })
  t.not(res1.length, 0)

  const res2 = await iSearch.searchBlocks('一个', {
    query: (tab) => `${tab}.type = :story`,
    parameters: { story: 'story' },
  })
  t.not(res2.length, 0)

  const res3 = await iSearch.searchBlocks('一个 测试 Sto', {
    query: (tab) => `${tab}.type = :story`,
    parameters: { story: 'story' },
  })
  t.not(res3.length, 0)

  const res4 = await iSearch.searchBlocks('应该没有', {
    query: (tab) => `${tab}.type = :story`,
    parameters: { story: 'story' },
  })
  t.is(res4.length, 0)

  await getRepository(BlockEntity).delete(id)
})

test('searchBlocks', async (t) => {
  const id = nanoid()
  const id2 = nanoid()

  await getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)
    await set(
      op,
      id,
      {
        id,
        type: BlockType.TEXT,
        storyId: 'storyId',
        parentId: 'storyId',
        parentTable: BlockParentType.BLOCK,
        content: {
          title: [['hello world']],
        },
        alive: true,
      },
      [],
    )
    await set(
      op,
      id2,
      {
        id: id2,
        type: BlockType.TEXT,
        storyId: 'storyId',
        parentId: 'storyId',
        parentTable: BlockParentType.BLOCK,
        content: {
          // test non-english words
          title: [['我要来测试 一下这个app分词是不是准确']],
        },
        alive: true,
      },
      [],
    )
  })

  const iSearch = getISearch()
  // all
  const res0 = await iSearch.searchBlocks('')
  t.not(res0.length, 0)

  const res1 = await iSearch.searchBlocks('hello')
  t.not(res1.length, 0)
  t.is(res1[0].highlight, '<em>hello</em> world')

  // English word cutting
  const res2 = await iSearch.searchBlocks('world hello')
  t.not(res2.length, 0)
  // regex uppercase
  const res25 = await iSearch.searchBlocks('Wor')
  t.not(res25.length, 0)

  // fuzzy
  const res3 = await iSearch.searchBlocks('测试')
  t.not(res3.length, 0)
  t.is(res3[0].highlight.indexOf('<em>测试</em>') >= 0, true)

  // space
  const res4 = await iSearch.searchBlocks('是不是 准确')
  t.not(res4.length, 0)

  const res5 = await iSearch.searchBlocks('是 准确')
  t.not(res5.length, 0)

  // reversed search key
  const res6 = await iSearch.searchBlocks('准确是不是')
  t.not(res6.length, 0)

  // regex
  const res7 = await iSearch.searchBlocks('我 确')
  t.not(res7.length, 0)

  await getRepository(BlockEntity).delete([id, id2])
})

test('search with invalid keywords', async (t) => {
  const iSearch = getISearch()
  await iSearch.searchBlocks("a '")
  await iSearch.searchBlocks("'")
  await iSearch.searchBlocks('*')
  await iSearch.searchBlocks('(')
  await iSearch.searchBlocks('\\')
  await iSearch.searchBlocks('$%^&*()_a')
  await iSearch.searchBlocks('+')
  t.pass()
})

test('search blocks group by storyId', async (t) => {
  const sid = nanoid()
  const bid = nanoid()
  await getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    // test non-english words
    const title = `这是一个用来测试的数据,${nanoid()}`
    await set(
      op,
      sid,
      {
        id: sid,
        parentId: 'test',
        parentTable: BlockParentType.WORKSPACE,
        storyId: sid,
        type: BlockType.STORY,
        content: { title: [[title]] },
        children: ['oid'],
        alive: true,
      },
      [],
    )
    await set(
      op,
      bid,
      {
        id: bid,
        parentId: sid,
        parentTable: BlockParentType.BLOCK,
        storyId: sid,
        type: BlockType.TEXT,
        content: { title: [[title]] },
        alive: true,
      },
      [],
    )
  })

  const iSearch = getISearch()
  const res0 = await iSearch.searchBlocksGroupByStoryId('')
  t.is(res0.length > 0, true)
  const r0 = _(res0).find((r) => r.storyId === sid)
  t.not(r0, undefined)

  const res1 = await iSearch.searchBlocksGroupByStoryId('测试的数据')
  t.is(res1.length > 0, true)
  const r1 = _(res1).find((r) => r.storyId === sid)
  t.not(r1, undefined)
  t.deepEqual(r1!.blocks.length, 2)

  // regex
  const res2 = await iSearch.searchBlocksGroupByStoryId('测')
  t.is(res2.length > 0, true)
  const r2 = _(res2).find((r) => r.storyId === sid)
  t.not(r2, undefined)
  t.deepEqual(r2!.blocks.length, 2)

  await getRepository(BlockEntity).delete([sid, bid])
})

test('search blocks by sql', async (t) => {
  const sid = nanoid()
  const bid = nanoid()
  await getConnection().transaction(async (manager) => {
    const op = new BlockOperation(uuid(), 'test', manager)

    await set(
      op,
      bid,
      {
        id: bid,
        parentId: sid,
        parentTable: BlockParentType.BLOCK,
        storyId: sid,
        type: BlockType.QUESTION,
        content: {
          title: [[`this is a block used for testing ${nanoid()}`]],
          sql: 'select * from blocks',
        },
        alive: true,
      },
      [],
    )
  })

  const iSearch = getISearch()
  // found when searching sql
  const res0 = await iSearch.searchBlocksBySql('select')
  t.not(res0.length, 0)
  t.is(res0[0].highlight.indexOf('<em>select</em> *') >= 0, true)
  // regex
  const res1 = await iSearch.searchBlocksBySql('sele')
  t.not(res1.length, 0)

  // not found when searching title
  const res2 = await iSearch.searchBlocksBySql('this')
  t.is(res2.length, 0)
  // regex
  const res3 = await iSearch.searchBlocksBySql('th')
  t.is(res3.length, 0)

  await getRepository(BlockEntity).delete([bid])
})
