import { QuerySelectorFamily } from '@app/components/editor/store/queries'
// eslint-disable-next-line camelcase
import { useRecoilCallback, useRecoilValue } from 'recoil'

export const useCompiledQuery = (storyId: string, queryId: string) => {
  const sql = useRecoilValue(QuerySelectorFamily({ storyId, queryId }))
  return sql
}

export const useGetCompiledQuery = () => {
  const getCompiledSQL = useRecoilCallback(
    ({ snapshot }) =>
      (storyId: string, queryId: string) => {
        const promise = snapshot.getPromise(QuerySelectorFamily({ storyId, queryId }))
        return promise
      },
    []
  )
  // const getCompiledSQL = useCallback([getRecoilValue])
  return getCompiledSQL
}
