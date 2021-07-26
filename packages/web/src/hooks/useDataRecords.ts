import crossfilter from 'crossfilter2'
import { useMemo } from 'react'
import type { Data } from '@app/components/v11n/types'

export function useDataRecords(data: Data) {
  return useMemo(
    () =>
      data.records.map((record) =>
        record.reduce<{ [key: string]: unknown }>((obj, value, index) => {
          obj[data.fields[index].name] = value
          return obj
        }, {})
      ),
    [data]
  )
}

export function useCrossFilter(data: Data) {
  const records = useDataRecords(data)
  return useMemo(() => crossfilter(records), [records])
}
