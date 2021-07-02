import test from 'ava'
import _ from 'lodash'
import { sqlMacro } from '../../src/utils/sql'

test('sqlMacro', (t) => {
  const sql = `select * from {{blockId1 as t1}} left join {{blockId2}} p on t1.a = p.a union all {{ blockId3 }} order by c`
  const { mainBody, subs } = sqlMacro(sql)
  t.deepEqual(
    mainBody,
    `select * from t1 left join ${subs[1].alias} p on t1.a = p.a union all ${subs[2].alias} order by c`,
  )
  t.deepEqual(_(subs).map('blockId').value(), ['blockId1', 'blockId2', 'blockId3'])
  t.deepEqual(subs[0].alias, 't1')
})
