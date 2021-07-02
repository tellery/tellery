import _ from 'lodash'

export function str2Date(str?: string): Date | undefined {
  return str && _(str).isString() ? new Date(str) : undefined
}
