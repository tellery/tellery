import test from 'ava'
import { hex2String, string2Hex } from '../../src/utils/common'

test('hex string', (t) => {
  const raw = 'raw test string'

  const hex = string2Hex(raw)
  const str = hex2String(hex)

  t.is(raw, str)
})
