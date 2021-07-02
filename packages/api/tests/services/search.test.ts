import '../../src/core/block/init'

import test from 'ava'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { getConnection, getRepository } from 'typeorm'

import { createDatabaseCon } from '../../src/clients/db/orm'
import { BlockOperation } from '../../src/core/block/operation'
import { FakePermission } from '../../src/core/permission'
import { getISearch } from '../../src/core/search/interface'
import BlockEntity from '../../src/entities/block'
import { UserEntity } from '../../src/entities/user'
import { SearchService } from '../../src/services/search'
import { BlockParentType, BlockType } from '../../src/types/block'
import { set, uuid } from '../testutils'

const service = new SearchService(new FakePermission(), getISearch())

let user: UserEntity
let bid: string
const sid = nanoid()

test.before(async () => {
  await createDatabaseCon()

  // mock user
  const entity = new UserEntity()
  entity.username = 'searchService'
  entity.email = nanoid()
  entity.avatar = 'xxx'
  entity.password = nanoid()
  user = await entity.save()
  return getConnection().transaction(async (manager) => {
    const uid = uuid()
    // mock block
    const bop = new BlockOperation(uid, 'test', manager)
    bid = nanoid()
    await set(
      bop,
      bid,
      {
        id: bid,
        type: BlockType.TEXT,
        storyId: sid,
        parentId: sid,
        parentTable: BlockParentType.BLOCK,
        format: { width: 100 },
        content: {
          title: [['searchService']],
        },
        alive: true,
        children: ['child'],
      },
      [],
    )
    await set(
      bop,
      sid,
      {
        id: sid,
        type: BlockType.STORY,
        storyId: sid,
        parentId: 'workspace',
        parentTable: BlockParentType.WORKSPACE,
        content: {
          title: [[nanoid()]],
        },
        alive: true,
        children: [bid],
      },
      [],
    )
  })
})

test.after.always(async () => {
  await getRepository(UserEntity).delete(user.id)
  await getRepository(BlockEntity).delete(bid)
})

test('test search service', async (t) => {
  // search all
  const all = await service.searchResources('test', 'test', 'searchService', [])

  t.not(_(all.results.highlights).keys().value().length, 0)
  // highlight
  t.deepEqual(all.results.highlights[bid], '<em>searchService</em>')
  t.not(all.results.blocks![bid], undefined)
  // fulfilled story block
  t.not(all.results.blocks![sid], undefined)
  t.not(all.results.users![user.id], undefined)
})
