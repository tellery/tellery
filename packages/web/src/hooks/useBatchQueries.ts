import { debounce } from 'lodash'
import React from 'react'
import { notifyManager, QueriesObserver, useQueryClient } from 'react-query'
import type { UseQueryOptions, UseQueryResult } from 'react-query/types'

export function useBatchQueries(queries: UseQueryOptions[]): UseQueryResult[] {
  const mountedRef = React.useRef(false)
  const [, forceUpdate] = React.useState(0)

  const queryClient = useQueryClient()

  const defaultedQueries = queries.map((options) => {
    const defaultedOptions = queryClient.defaultQueryObserverOptions(options)

    // Make sure the results are already in fetching state before subscribing or updating options
    defaultedOptions.optimisticResults = true

    return defaultedOptions
  })

  const obsRef = React.useRef<QueriesObserver>()

  if (!obsRef.current) {
    obsRef.current = new QueriesObserver(queryClient, defaultedQueries)
  }

  const result = obsRef.current.getOptimisticResult(defaultedQueries)

  React.useEffect(() => {
    mountedRef.current = true

    const unsubscribe = obsRef.current!.subscribe(
      debounce(() => {
        notifyManager.batchCalls(() => {
          if (mountedRef.current) {
            forceUpdate((x) => x + 1)
          }
        })
      })
    )

    return () => {
      mountedRef.current = false
      unsubscribe()
    }
  }, [])

  React.useEffect(() => {
    // Do not notify on updates because of changes in the options because
    // these changes should already be reflected in the optimistic result.
    obsRef.current!.setQueries(defaultedQueries, { listeners: false })
  }, [defaultedQueries])

  return result
}
