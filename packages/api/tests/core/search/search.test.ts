import test from 'ava'
import _ from 'lodash'

import { createDatabaseCon } from '../../../src/clients/db/orm'
import { Block } from '../../../src/core/block'
import { TextBlock } from '../../../src/core/block/text'
import { search } from '../../../src/core/search'
import { HintData, ISearch, SearchableResourceType } from '../../../src/core/search/interface'
import { User } from '../../../src/core/user'
import { BlockParentType } from '../../../src/types/block'
import { AccountStatus } from '../../../src/types/user'

class TestISearch implements ISearch {
  async searchUsers(): Promise<HintData[]> {
    const total = 10
    return _(total)
      .range()
      .map((r) => ({
        hint: new User('test', 'test', 'test', 'test', AccountStatus.ACTIVE, 0),
        highlight: '',
        score: r,
      }))
      .value()
  }

  async searchBlocks(): Promise<HintData[]> {
    const total = 10
    return _(total)
      .range()
      .map((r) => ({
        hint: new TextBlock(
          'test',
          'xxx',
          BlockParentType.BLOCK,
          'test',
          { title: [['test']] },
          true,
          0,
        ),
        highlight: '',
        score: r,
      }))
      .value()
  }

  async searchBlocksGroupByStoryId(): Promise<
    { score?: number; storyId: string; blocks: { value: Block; highlight: string }[] }[]
  > {
    return []
  }

  async searchBlocksByTitle(): Promise<HintData[]> {
    return []
  }
}

test.before(async () => {
  await createDatabaseCon()
})

test('splitSearchRes', async (t) => {
  const res = await search(
    new TestISearch(),
    'test',
    undefined,
    [SearchableResourceType.BLOCK, SearchableResourceType.USER],
    15,
  )
  t.is(res.hints[0].score, 9)
  t.is(res.hints[14].score, 2)
})

test('highlight should work', async (t) => {
  // user highlight is username
  const userRes = await search(
    new TestISearch(),
    'test',
    undefined,
    [SearchableResourceType.USER],
    1,
  )
  t.not(userRes.hints.length, 0)
  t.is(userRes.hints[0].highlight, 'test')

  // block highlight
  const blockRes = await search(
    new TestISearch(),
    'test',
    undefined,
    [SearchableResourceType.BLOCK],
    1,
  )
  t.not(blockRes.hints.length, 0)
  t.is(blockRes.hints[0].highlight, '<em>test</em>')
})
