import { isString } from 'lodash'

export const tag = {
  Reference: 'r',
  Story: 's',
  Block: 'b',
}

export type Token = string[] | LinkToken

export type LinkToken = [string, string[][]]

export function isLinkToken(token: Token): token is LinkToken {
  return isString(token[0]) && token.length >= 2
}
