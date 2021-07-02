import test from 'ava'
import { Snapshot } from '../../../src/core/snapshot'

test('setSnapshotContentByPath', (t) => {
  const snapshot1 = new Snapshot(
    'xxx',
    'xxx',
    'xxx',
    { fields: [], records: [], truncated: false },
    true,
    0,
  )

  // no path
  snapshot1.setContentByPath([], {
    id: 'xxx',
    questionId: 'xxxx',
    sql: 'xxxx',
    data: {
      fields: [{ name: 'xxx', displayType: 'string', sqlType: 'string' }],
      records: [],
      truncated: false,
    },
  })

  t.deepEqual(snapshot1.questionId, 'xxxx', 'snapshot1 questionId is incorrect')
  t.deepEqual(snapshot1.sql, 'xxxx')
  t.deepEqual(
    snapshot1.data,
    {
      fields: [{ name: 'xxx', displayType: 'string', sqlType: 'string' }],
      records: [],
      truncated: false,
    },
    'snapshot1 data is incorrect',
  )

  // path
  const snapshot2 = new Snapshot(
    'xxx',
    'xxx',
    'sql',
    { fields: [], records: [], truncated: false },
    true,
    0,
  )
  snapshot2.setContentByPath(
    ['data', 'fields'],
    [{ name: 'xxx', displayType: 'xxx', sqlType: 'xxx' }],
  )

  t.deepEqual(
    snapshot2.data,
    {
      fields: [{ name: 'xxx', displayType: 'xxx', sqlType: 'xxx' }],
      records: [],
      truncated: false,
    },
    'story2 children is incorrect',
  )
})
