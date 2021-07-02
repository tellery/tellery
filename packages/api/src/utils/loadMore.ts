import { first, last } from 'lodash'
import { LoadMoreKey, SkipLoadMoreKey } from '../types/common'

// loadMore
export function loadMore<T>(
  list: T[],
  limit: number,
  getLoadMoreCursor: (val: T) => number,
): { data: T[]; next?: LoadMoreKey } {
  if (list.length !== limit || list.length === 0) {
    return { data: list }
  }

  const l = last(list)
  const f = first(list)
  const lastVal = getLoadMoreCursor(l!)
  const firstVal = getLoadMoreCursor(f!)

  return {
    data: list,
    next: {
      timestamp:
        firstVal === lastVal
          ? lastVal - 1 // to avoid deadlock
          : lastVal,
      limit,
    },
  }
}

// loadMore
export function skipLoadMore<T>(
  list: T[],
  limit: number,
  skip: number,
): { data: T[]; next?: SkipLoadMoreKey } {
  if (list.length !== limit || list.length === 0) {
    return { data: list }
  }

  return {
    data: list,
    next: {
      skip: skip + limit,
      limit,
    },
  }
}
