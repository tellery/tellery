import type { Data, DisplayType } from '@app/components/v11n/types'

export function useDataFieldsDisplayType(fields: Data['fields']): { [name: string]: DisplayType } {
  return fields.reduce<{ [name: string]: DisplayType }>((obj, field) => {
    obj[field.name] = field.displayType
    return obj
  }, {})
}
