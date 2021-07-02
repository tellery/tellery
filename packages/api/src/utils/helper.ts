import { createHash } from 'crypto'
import _ from 'lodash'

/**
 * @param plain source document
 * @param text keyword
 */
export function highlight(plain: string, text: string): string {
  if (!text) {
    return plain
  }
  let origin = plain
  // word cutting, and deduplicate
  const words = _(text.split(' '))
    .uniq()
    .compact()
    .sort((a, b) => b.length - a.length)
    .value()

  _(words).forEach((w) => {
    try {
      origin = _(origin).replace(new RegExp(w, 'gi'), (match) => `<em>${match}</em>`)
    } catch (err) {
      // ignore
    }
  })
  return origin
}

/**
 * hash
 */
export function md5(str: string): string {
  return createHash('md5').update(str, 'utf8').digest('hex')
}
