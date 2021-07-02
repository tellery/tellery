import test from 'ava'
import { decrypt, encrypt } from '../../src/utils/crypto'

test('encrypt and decrypt', (t) => {
  const raw = 'raw test string'
  const secret = 'secret'

  const encrypted = encrypt(raw, secret)
  const decrypted = decrypt(encrypted, secret)

  t.is(raw, decrypted)
})
