import _ from 'lodash'

export function str2Date(str?: string): Date | undefined {
  return str && _(str).isString() ? new Date(str) : undefined
}

export function strOrDate2number(str?: string | Date): number | undefined {
  if (!str) {
    return
  }

  if (_(str).isString()) {
    return str2Date(str as string)?.getTime()
  }
  return (str as Date).getTime()
}
