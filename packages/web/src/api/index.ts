import type { DisplayType, Data } from '@app/components/v11n/types'
import { createDeletedBlock } from '@app/helpers/blockFactory'
import axios from 'axios'
import type { User } from '@app/hooks/api'
import { debounce, isEmpty, omitBy } from 'lodash'
import { toast } from 'react-toastify'
import type { BackLinks, Dimension, Editor, Snapshot, Story, Thought, Workspace } from '@app/types'
import { emitBlockUpdate } from '@app/utils/remoteStoreObserver'
import JSON5 from 'json5'

import { wrapAuth } from './auth'
import type { Transcation } from '@app/hooks/useCommit'

export const request = wrapAuth(axios.create({ baseURL: '', withCredentials: true }))

request.interceptors.response.use(undefined, (error) => {
  if (error.response.status >= 400) {
    toast.error(`Error ${error.response.status}: ${error.response.data.errMsg}`)
  }
  return Promise.reject(error)
})

export const translateSmartQuery = async (
  workspaceId: string,
  connectorId: string,
  queryBuilderId?: string,
  metricIds: string[] = [],
  dimensions: Dimension[] = [],
  filters?: Editor.FilterBuilder
) => {
  return request.post<{ sql: string }>('/api/connectors/translateSmartQuery', {
    workspaceId: workspaceId,
    connectorId: connectorId,
    queryBuilderId,
    metricIds,
    dimensions,
    filters
  })
}

export const getWorkspaceList = async () =>
  request.post<{ workspaces: Workspace[] }>('/api/workspaces/list').then((res) => res.data.workspaces)

export const userLogin = async ({ email, password }: { email: string; password: string }) => {
  const { data } = await request.post<User>('/api/users/login', { email, password })
  return data
}

export const userLogout = async () => {
  const { data } = await request.post<User>('/api/users/logout')
  return data
}

export const userConfirm = async ({ code }: { code: string }) => {
  const { data } = await request.post<Pick<User, 'id' | 'status'>>('/api/users/confirm', { code })
  return data
}

export async function userInviteMembersToWorkspace(
  workspaceId: string,
  members: { email: string; role: Workspace['members'][0]['role'] }[]
) {
  const { data } = await request.post<{ linkPairs: { [email: string]: string } }>(
    '/api/users/inviteMembersToWorkspace',
    {
      workspaceId: workspaceId,
      users: members
    }
  )
  return data
}

export const updateUser = async ({
  avatar,
  name,
  newPassword,
  currentPassword
}: {
  avatar?: string
  name?: string
  newPassword?: string
  currentPassword?: string
}) => {
  const { data } = await request.post<User>(
    '/api/users/update',
    omitBy(
      {
        avatar,
        name,
        newPassword,
        currentPassword
      },
      isEmpty
    )
  )
  return data
}

export const importFromCSV = (props: {
  key: string
  collection: string
  connectorId: string
  profile: string
  workspaceId: string
  database: string
}) => {
  return request.post<{ collection: string; database: string }>('/api/connectors/import', {
    ...props
  })
}

export const getStoriesByTitle = async ({ title, workspaceId }: { title: string; workspaceId: string }) => {
  const stories = await request.post<{ blocks: Story[] }>('/api/stories/listByTitle', {
    workspaceId,
    title
  })
  return Object.values(stories.data.blocks)
}

export type SearchBlockResult<T> = {
  blocks: {
    [key: string]: T extends Editor.BlockType.Visualization
      ? Editor.VisualizationBlock
      : T extends Editor.BlockType.Story
      ? Story
      : T extends Editor.BlockType.Thought
      ? Thought
      : Editor.ContentBlock
  }
  searchResults: string[]
  highlights: { [k: string]: string }
}

export async function searchBlocks<T extends Editor.BlockType>(
  keyword: string,
  limit: number,
  workspaceId: string,
  type?: T
) {
  return request
    .post<{ results: SearchBlockResult<T> }>('/api/search', {
      keyword,
      workspaceId,
      types: ['block'],
      limit,
      filters: type ? { type } : undefined
    })
    .then(({ data: { results } }) => results)
}

export async function referenceCompletion<T extends Editor.BlockType>(
  workspaceId: string,
  keyword: string,
  limit: number
) {
  return request
    .post<{ results: SearchBlockResult<T> }>('/api/referenceCompletion', {
      workspaceId,
      keyword,
      limit
    })
    .then(({ data: { results } }) => results)
}

export interface EntityRequest {
  id: string
  storyId?: string
  questionId?: string
  blockId?: string
}

const entityTypes = ['blocks', 'users', 'links', 'snapshots']
export interface EntityRequestItems {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: Record<string, any>
}

const fetcher: {
  items: EntityRequestItems
} = { items: {} }

export const fetchEntities = debounce((items: EntityRequestItems, workspaceId: string) => {
  fetcher.items = {}
  request
    .post<EntityRequestItems>('/api/mgetResources', {
      requests: [
        ...(Object.values(items?.blocks ?? {}) as { args: EntityRequest }[]).map(({ args }) => ({
          type: 'block',
          ...args
        })),
        ...(Object.values(items?.snapshots ?? {}) as { args: EntityRequest }[]).map(({ args }) => ({
          type: 'snapshot',
          ...args
        })),
        ...(Object.values(items?.users ?? {}) as { args: EntityRequest }[]).map(({ args }) => ({
          type: 'user',
          ...args
        })),
        ...(Object.values(items?.links ?? {}) as { args: EntityRequest }[]).map(({ args }) => ({
          type: 'link',
          ...args
        }))
      ],
      workspaceId
    })
    .then((res) => {
      for (const type of entityTypes) {
        const typeItems = items?.[type]
        Object.keys(typeItems).forEach((id) => {
          const resolve = typeItems[id].resolve
          // const reject = typeItems[id].reject
          switch (type) {
            case 'users':
              resolve(res.data?.[type]?.[id] ?? { alive: false })
              break
            case 'links':
              resolve(res.data?.[type]?.[id] ?? { alive: false })
              break
            case 'blocks': {
              const remoteBlock = res.data?.[type]?.[id] as Editor.BaseBlock | undefined
              if (remoteBlock === undefined) {
                const emptyBlock = createDeletedBlock(id)
                resolve(emptyBlock)
                emitBlockUpdate(emptyBlock)
              } else {
                resolve(remoteBlock)
                emitBlockUpdate(remoteBlock)
              }
              break
            }
            case 'snapshots':
              resolve(res.data?.[type]?.[id] ?? { alive: false })
              break
          }
        })
      }
    })
    .catch((err) => {
      console.error(err)
      for (const type of entityTypes) {
        const typeItems = items?.[type]
        Object.keys(typeItems).forEach((id) => {
          const reject = typeItems[id].reject
          reject(err)
        })
      }
    })
})

export const fetchEntity = <T>(
  type: 'block' | 'question' | 'user' | 'link' | 'snapshot',
  args: EntityRequest,
  workspaceId: string
): Promise<T> => {
  return new Promise((resolve, reject) => {
    fetcher.items = {
      blocks: {
        ...fetcher.items?.blocks,
        ...(type === 'block' ? { [args.id]: { resolve, reject, args } } : {})
      },
      snapshots: {
        ...fetcher.items?.snapshots,
        ...(type === 'snapshot' ? { [args.id]: { resolve, reject, args } } : {})
      },
      users: {
        ...fetcher.items?.users,
        ...(type === 'user' ? { [args.id]: { resolve, reject, args } } : {})
      },
      links: {
        ...fetcher.items?.links,
        ...(type === 'link' ? { [args.id]: { resolve, reject, args } } : {})
      }
    }
    fetchEntities({ ...fetcher.items }, workspaceId)
  })
}

export const fetchStory = (id: string, workspaceId: string) => {
  return fetchEntity<Story>('block', { id }, workspaceId)
}

export const fetchBlock = (id: string, workspaceId: string) => {
  return fetchEntity<Editor.BaseBlock>('block', { id }, workspaceId)
}

export const fetchUser = (id: string, workspaceId: string) => {
  return fetchEntity<User>('user', { id }, workspaceId)
}

export const fetchStoryBackLinks = (storyId: string, workspaceId: string) => {
  return fetchEntity<BackLinks>('link', { id: storyId }, workspaceId)
}

export const fetchQuestionBackLinks = (blockId: string, workspaceId: string) => {
  return fetchEntity<BackLinks>('link', { id: blockId }, workspaceId)
}

export const fetchSnapshot = (snapshotId: string, workspaceId: string) => {
  return fetchEntity<Snapshot>('snapshot', { id: snapshotId }, workspaceId)
}

export async function getCollectionSchema(props: {
  database: string
  collection: string
  connectorId: string
  profile: string
  workspaceId: string
}) {
  return request
    .post<{ fields: { name: string; sqlType: string; displayType: DisplayType }[] }>(
      '/api/connectors/getCollectionSchema',
      { ...props }
    )
    .then((res) => res.data.fields)
}

export const sqlRequest = ({
  workspaceId,
  sql,
  questionId,
  connectorId,
  profile
}: {
  workspaceId: string
  sql: string
  questionId?: string
  connectorId: string
  profile: string
}) => {
  const source = axios.CancelToken.source()

  const promise = request
    .post(
      '/api/connectors/executeSql',
      {
        connectorId,
        sql,
        workspaceId,
        questionId,
        profile
      },
      {
        cancelToken: source.token,
        transformResponse: (res) => JSON5.parse(res)
      }
    )
    .then((res) => {
      const data = res.data as Data
      const { fields, records, errMsg } = data
      const count: { [key: string]: number } = {}
      return {
        fields: fields?.map(({ name, ...rest }) => {
          count[name] = (count[name] || 0) + 1
          if (count[name] > 1) {
            return { ...rest, name: `${name}_${count[name] - 1}` }
          }
          return { ...rest, name }
        }),
        records,
        errMsg
      }
    })
    .catch((err) => {
      throw err.response.data
    })

  ;(promise as unknown as { cancel: Function }).cancel = () => {
    source.cancel('Query was cancelled by React Query')
  }
  return promise
}

export type ResourceType = 'block' | 'user' | 'link'

export type Entity = (User | Editor.BaseBlock | Story | Thought) & { resourceType: string }

export function saveTranscations(transcations: Transcation[]) {
  return request.post('/api/operations/saveTransactions', {
    transactions: transcations
  })
}

export const getMetabaseToken = (params: { siteUrl: string; payload: object }) => {
  return request.post<{ token: string }>('/api/thirdParty/metabase/token', params)
}
