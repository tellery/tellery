import test from 'ava'
import { highlight } from '../../src/utils/helper'

test('highlight', (t) => {
  const res1 = highlight('testing highlight for english', 'english highlight')
  t.deepEqual(res1, `testing <em>highlight</em> for <em>english</em>`)

  // duplicate
  const res2 = highlight('doom', 'o')
  t.deepEqual(res2, 'd<em>o</em><em>o</em>m')

  // ignore case
  const res3 = highlight('dOm', 'o')
  t.deepEqual(res3, 'd<em>O</em>m')

  // empty keyword, returns original document
  const res4 = highlight('dOm', '')
  t.deepEqual(res4, 'dOm')

  // mute space
  const res5 = highlight('abc', 'a ')
  t.deepEqual(res5, '<em>a</em>bc')
})

test('highlight with invalid characters', (t) => {
  highlight('test words', '(')
  t.pass()
})
