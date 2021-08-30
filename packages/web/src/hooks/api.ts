import {
  Entity,
  EntityRequest,
  fetchEntity,
  fetchQuestionBackLinks,
  fetchStoryBackLinks,
  getCollectionSchema,
  request,
  ResourceType,
  SearchBlockResult,
  searchBlocks,
  sqlRequest
} from '@app/api'
import { isDataAssetBlock } from '@app/components/editor/Blocks/utils'
import { useAsync } from '@app/hooks'
import { useWorkspace } from '@app/hooks/useWorkspace'
import type { AvailableConfig, BackLinks, ProfileConfig, Story, UserInfo, Workspace } from '@app/types'
import { Editor } from '@app/types'
import { queryClient } from '@app/utils'
import { compact } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  QueryObserverResult,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryOptions
} from 'react-query'
import { useRecoilCallback, useRecoilValue, useRecoilValueLoadable, waitForAll } from 'recoil'
import invariant from 'tiny-invariant'
import { blockUpdater, TelleryBlockAtom, TellerySnapshotAtom, TelleryUserAtom } from '../store/block'
import { useBatchQueries } from './useBatchQueries'

export type User = {
  id: string
  avatar?: string
  name: string
  email: string
  status: 'active' | 'confirmed' | 'verifying'
}

export const useStory = (id: string) => {
  const result = useBlock<Story>(id)
  return result
}

export const useUpdateBlocks = () => {
  const updateBlocks = useRecoilCallback(
    (recoilInterface) => (blocks: Record<string, Editor.BaseBlock>) => {
      Object.values(blocks).forEach((block) => {
        const targetAtom = TelleryBlockAtom(block.id)
        const loadable = recoilInterface.snapshot.getInfo_UNSTABLE(targetAtom).loadable
        if (loadable === undefined || loadable.state !== 'hasValue') {
          recoilInterface.set(targetAtom, block)
        } else {
          recoilInterface.set(targetAtom, blockUpdater(block, loadable.contents) as Editor.BaseBlock)
        }
      })
    },
    []
  )
  return updateBlocks
}

export const useFetchStoryChunk = <T extends Editor.BaseBlock = Story>(id: string, suspense: boolean = true) => {
  const updateBlocks = useUpdateBlocks()
  const workspace = useWorkspace()
  useQuery<Record<string, Editor.BaseBlock>>(
    ['story', 'chunk', workspace, id],
    async () =>
      request
        .post('/api/stories/load', {
          workspaceId: workspace.id,
          storyId: id
        })
        .then(({ data: { blocks } }) => {
          updateBlocks(blocks)
          return blocks
        }),
    { suspense: suspense }
  )
}

export const useStoryPinnedStatus = (id?: string) => {
  const { data: view } = useWorkspaceView()
  return !!id && !!view?.pinnedList.includes(id)
}

// export const useStoryNameConflict = (keyword: string, storyId: string) => {
//   const result = useQuery(
//     ['stories', 'search', 'names', keyword],
//     async () =>
//       request
//         .post('/api/stories/search', {
//           keyword,
//           workspaceId: WORKSPACEID,
//           filters: { type: 'story' }
//         })
//         .then((res) => {
//           const data = res.data as {
//             results: {
//               blocks: { [key: string]: Editor.ContentBlock }
//               searchResults: string[]
//             }
//           }
//           const firstMatchedId = data.results.searchResults[0]
//           if (firstMatchedId) {
//             const matchedBlock = data.results.blocks[firstMatchedId]
//             const matchedTitle = matchedBlock?.content?.title?.[0]?.[0]
//             console.log('conflict', matchedTitle === keyword && firstMatchedId !== storyId)
//             return matchedTitle === keyword && firstMatchedId !== storyId
//           } else {
//             return false
//           }
//         }),
//     { enabled: !!keyword.length }
//   )

//   return result
// }

export const useStoriesSearch = (keyword: string) => {
  const workspace = useWorkspace()
  const result = useInfiniteQuery(
    ['stories', 'search', workspace, keyword],
    async ({ pageParam }) =>
      request
        .post('/api/stories/search', {
          keyword,
          workspaceId: workspace.id,
          next: pageParam
        })
        .then((res) => {
          return res.data as {
            results: {
              blocks: { [key: string]: Editor.ContentBlock }
              users: { [k: string]: UserInfo }
              links: { [k: string]: string[] }
              searchResults: string[]
              highlights: { [k: string]: string }
            }
            next?: unknown
          }
        }),
    { getNextPageParam: ({ next }) => next, refetchOnMount: true }
  )

  return result
}

export function useSearchBlocks<T extends Editor.BlockType>(
  keyword: string,
  limit: number,
  type?: T,
  options?: UseQueryOptions<SearchBlockResult<T>>
) {
  const workspace = useWorkspace()
  const blockUpdater = useUpdateBlocks()
  return useQuery<SearchBlockResult<T>>(
    ['search', 'block', type, keyword, limit],
    async () =>
      searchBlocks(keyword, limit, workspace.id, type).then((results) => {
        blockUpdater(results.blocks)
        return results
      }),
    options
  )
}

export function useSearchMetrics(
  keyword: string,
  limit: number,
  options?: UseQueryOptions<SearchBlockResult<Editor.BlockType.Metric>>
) {
  return useSearchBlocks(keyword, limit, Editor.BlockType.Metric, options)
}

export function useSearchDBTBlocks(
  keyword: string,
  limit: number,
  options?: UseQueryOptions<SearchBlockResult<Editor.BlockType.DBT>>
) {
  return useSearchBlocks(keyword, limit, Editor.BlockType.DBT, options)
}

export const useRefetchMetrics = () => {
  const queryClient = useQueryClient()
  const refetch = useCallback(() => {
    queryClient.refetchQueries(['search', 'block', Editor.BlockType.Metric])
  }, [queryClient])
  return refetch
}

export const useListDatabases = () => {
  const workspace = useWorkspace()
  return useQuery<string[]>(
    ['listDatabases', workspace],
    () =>
      request
        .post('/api/connectors/listDatabases', {
          connectorId: workspace.preferences.connectorId,
          profile: workspace.preferences.profile,
          workspaceId: workspace.id
        })
        .then((res) => res.data.databases),
    {
      retry: false,
      enabled: !!(workspace.preferences.connectorId && workspace.preferences.profile)
    }
  )
}

export const useListCollections = (database?: string) => {
  const workspace = useWorkspace()
  return useQuery<string[]>(
    ['listCollections', workspace, database],
    () =>
      request
        .post('/api/connectors/listCollections', {
          connectorId: workspace.preferences.connectorId,
          profile: workspace.preferences.profile,
          database,
          workspaceId: workspace.id
        })
        .then((res) => res.data.collections),
    {
      enabled: !!database,
      retry: false
    }
  )
}

export const useGetCollectionSchema = (database?: string, collection?: string) => {
  const workspace = useWorkspace()
  return useQuery(
    ['getCollectionSchema', database, collection],
    () => {
      return getCollectionSchema({
        database: database!,
        collection: collection!,
        workspaceId: workspace.id,
        profile: workspace.preferences.profile!,
        connectorId: workspace.preferences.connectorId!
      })
    },
    {
      enabled: !!(database && collection),
      retry: false
    }
  )
}

const BatchGetOptions = {
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  keepPreviousData: true
}

export const useMgetEntities = (entities: { type: ResourceType; args: EntityRequest }[]) => {
  const workspace = useWorkspace()
  const queriesArray = useMemo(
    () =>
      entities
        ? entities.map((entitiy) => {
            return {
              queryKey: [entitiy.type, entitiy.args.id],
              queryFn: () => fetchEntity(entitiy.type, entitiy.args, workspace.id),
              ...BatchGetOptions
            }
          })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(entities)]
  )
  const queries = useBatchQueries(queriesArray) as QueryObserverResult<Entity>[]

  const enabled = !!(entities && queries.length === entities.length)

  const isSuccess = useMemo(() => enabled && queries.every((query) => query.isSuccess), [enabled, queries])
  const data = useMemo(() => {
    const resultMap = isSuccess
      ? queries.reduce(
          (acc, query) => {
            if (query.data?.id) {
              acc[query.data.resourceType][query.data.id] = query.data
            }
            return acc
          },
          {
            link: {},
            question: {},
            user: {},
            block: {}
          } as { [key: string]: Record<string, Entity> }
        )
      : undefined
    return resultMap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess])

  return useMemo(() => ({ queries, isSuccess, data }), [data, isSuccess, queries])
}

export const useMgetBlocks = (ids?: string[]): { data?: Record<string, Editor.BaseBlock>; isSuccess?: boolean } => {
  const atoms = useRecoilValueLoadable(waitForAll(ids?.map((id) => TelleryBlockAtom(id)) ?? []))
  const [state, setState] = useState({})

  useEffect(() => {
    if (!ids || !ids.length) {
      setState({})
      return
    }
    switch (atoms.state) {
      case 'hasValue':
        setState({
          data: atoms.contents.reduce((acc, block) => {
            invariant(block, 'block is undefined')
            if (block.id) {
              acc[block.id] = block
            }
            return acc
          }, {} as { [key: string]: Editor.BaseBlock }),
          isSuccess: true
        })
        break
      case 'loading':
        setState({})
        break
    }
  }, [atoms, ids])

  return state
}

export const useMgetBlocksSuspense = (ids: string[]): Editor.BaseBlock[] => {
  const atoms = useRecoilValue(waitForAll(ids.map((id) => TelleryBlockAtom(id))))

  return atoms as Editor.BaseBlock[]
}

export const useUser = (id: string | null): { data?: User; error?: { statusCode?: number } } => {
  const atom = useRecoilValueLoadable(TelleryUserAtom(id))
  const [state, setState] = useState({})

  useEffect(() => {
    if (!id) {
      return
    }

    switch (atom.state) {
      case 'hasValue':
        setState({ data: atom.contents })
        break
      case 'loading':
        setState({})
        break
      case 'hasError':
        setState({ error: atom.contents })
        break
    }
  }, [atom.contents, atom.state, id])

  return state
}

export const useMgetUsers = (ids?: string[]): { data?: Record<string, User>; isSuccess?: boolean } => {
  const atoms = useRecoilValueLoadable(waitForAll(ids?.map((id) => TelleryUserAtom(id)) ?? []))
  const [state, setState] = useState({})

  useEffect(() => {
    switch (atoms.state) {
      case 'hasValue':
        setState({
          data: atoms.contents.reduce((acc, user) => {
            invariant(user, 'user is undefined')
            if (user.id) {
              acc[user.id] = user
            }
            return acc
          }, {} as { [key: string]: User }),
          isSuccess: true
        })
        break
      case 'loading':
        setState({})
        break
    }
  }, [atoms])
  return state
}

export const useBlockSuspense = <T extends Editor.BaseBlock = Editor.BaseBlock>(id: string): T => {
  const atom = useRecoilValue(TelleryBlockAtom(id))

  invariant(atom, 'atom is undefined')

  return atom as unknown as T
}

export const useBlock = <T extends Editor.BaseBlock = Editor.BaseBlock>(
  id: string
): { data?: T; error?: { statusCode?: number } } => {
  const atom = useRecoilValueLoadable(TelleryBlockAtom(id))
  const [state, setState] = useState({})

  useEffect(() => {
    if (!id) {
      setState({})
      return
    }

    switch (atom.state) {
      case 'hasValue':
        setState({ data: atom.contents })
        break
      case 'loading':
        setState({})
        break
      case 'hasError':
        setState({ error: atom.contents })
        break
    }
  }, [atom.contents, atom.state, id])

  return state
}

export const useSnapshot = (id: string | null = null) => {
  const atom = useRecoilValue(TellerySnapshotAtom(id))

  return atom
  // const workspace = useWorkspace()

  // return useQuery<Snapshot>(['snapshot', id], () => fetchSnapshot(id, workspace.id), {
  //   enabled: !!id,
  //   keepPreviousData: true
  // })
}

export const useGetSnapshot = () => {
  // const snapshot = useSnapshot(block?.content?.snapshotId)
  const getSnapshot = useRecoilCallback(
    (recoilCallback) =>
      async ({ snapshotId }: { snapshotId?: string }) => {
        const snapshot = await recoilCallback.snapshot.getPromise(TellerySnapshotAtom(snapshotId ?? null))
        return snapshot
      },
    []
  )
  return getSnapshot
}

export const useQuestionBackLinks = (id: string = '') => {
  const workspace = useWorkspace()

  return useQuery<BackLinks>(['backlinks', 'question', id], () => fetchQuestionBackLinks(id, workspace.id), {
    enabled: !!id
  })
}

export const useStoryBackLinks = (id: string = '') => {
  const workspace = useWorkspace()
  return useQuery<BackLinks>(['backlinks', 'story', id], () => fetchStoryBackLinks(id, workspace.id), { enabled: !!id })
}

export const useQuestionDownstreams = (id?: string) => {
  const { data: links, refetch } = useQuestionBackLinks(id)
  const blockIds = useMemo(
    () => [
      ...new Set(links?.backwardRefs.map(({ blockId }) => blockId)),
      ...new Set(links?.backwardRefs.map(({ storyId }) => storyId))
    ],
    [links]
  )
  const { data: blocks } = useMgetBlocks(blockIds)
  const items = useMemo(
    () =>
      compact(
        links?.backwardRefs
          ?.map(({ blockId }) => blocks?.[blockId])
          .filter((block) => block && isDataAssetBlock(block.type))
      ),
    [blocks, links?.backwardRefs]
  )
  return { data: items, refetch }
}

export function useWorkspaceList(options?: UseQueryOptions<Workspace[]>) {
  return useQuery<Workspace[]>(
    ['workspaces', 'list'],
    () => request.post('/api/workspaces/list').then((res) => res.data.workspaces),
    options
  )
}

export function useWorkspaceView() {
  const workspace = useWorkspace()
  return useQuery<{ id: string; pinnedList: string[] }>(['workspaces', 'getView', workspace], () =>
    request.post('/api/workspaces/getView', { workspaceId: workspace.id }).then((res) => res.data)
  )
}

export function useWorkspaceDetail() {
  const workspace = useWorkspace()
  return useQuery<Workspace>(['workspaces', 'getDetail', workspace], () =>
    request.post('/api/workspaces/getDetail', { workspaceId: workspace.id }).then((res) => res.data.workspace)
  )
}

export function useWorkspaceUpdate() {
  const workspace = useWorkspace()
  const handleUpdate = useCallback(
    (payload: { name?: string; avatar?: string; resetInviteCode?: boolean }) =>
      request.post('/api/workspaces/update', { ...payload, workspaceId: workspace.id }),
    [workspace.id]
  )
  return useAsync(handleUpdate)
}

export function useWorkspaceUpdateRole() {
  const workspace = useWorkspace()
  const handleUpdateRole = useCallback(
    (userId: string, role: Workspace['members'][0]['role']) =>
      request.post('/api/workspaces/updateRole', { workspaceId: workspace.id, userId, role }),
    [workspace.id]
  )
  return useAsync(handleUpdateRole)
}

export function useWorkspaceInviteMembers(members: { email: string; role: Workspace['members'][0]['role'] }[]) {
  const workspace = useWorkspace()
  const handleInviteMembers = useCallback(
    () =>
      request
        .post<{ linkPairs: { [email: string]: string } }>('/api/workspaces/inviteMembers', {
          workspaceId: workspace.id,
          users: members
        })
        .then((response) => response.data),
    [members, workspace.id]
  )
  return useAsync(handleInviteMembers)
}

export function useWorkspaceKickout() {
  const workspace = useWorkspace()
  const handleKickout = useCallback(
    (userIds: string[]) => request.post('/api/workspaces/kickout', { workspaceId: workspace.id, userIds }),
    [workspace]
  )
  return useAsync(handleKickout)
}

export function useWorkspaceLeave() {
  const workspace = useWorkspace()
  const handleLeave = useCallback(
    () => request.post('/api/workspaces/leave', { workspaceId: workspace.id }),
    [workspace]
  )
  return useAsync(handleLeave)
}

type StoryVisisRecord = { storyId: string; userId: string; lastVisitTimestamp: number }[]

export const useStoryVisits = (storyId: string = '', limit = 5) => {
  const workspace = useWorkspace()
  return useQuery<StoryVisisRecord>(
    ['story', storyId, 'visits', workspace],
    () =>
      request
        .post('/api/stories/getVisits', { workspaceId: workspace.id, storyId, limit })
        .then((res) => res.data.visits),
    { enabled: !!storyId }
  )
}

const recordVisits = ({ workspaceId, storyId }: { workspaceId: string; storyId: string; userId: string }) => {
  return request.post('/api/stories/recordVisit', { workspaceId, storyId })
}

export const useRecordStoryVisits = () => {
  const mutation = useMutation(recordVisits, {
    onMutate: ({ storyId, userId }) => {
      // queryClient.invalidateQueries(['story', storyId, 'visits'])
      queryClient.setQueryData<StoryVisisRecord | undefined>(['story', storyId, 'visits'], (storyVisits) => {
        return [
          {
            storyId,
            userId: userId,
            lastVisitTimestamp: Date.now()
          },
          ...(storyVisits?.filter((visit) => visit.userId !== userId) ?? [])
        ] as StoryVisisRecord
      })
    }
  })
  return mutation
}

export const useExecuteSQL = (id: string) => {
  const executeSQL = useMutation(sqlRequest, { mutationKey: id })
  return executeSQL
}

export const useConnectorsList = () => {
  const workspace = useWorkspace()
  return useQuery<{ id: string; url: string; name: string }[]>(['connector', 'list', workspace], () =>
    request.post('/api/connectors/list', { workspaceId: workspace.id }).then((res) => res.data.connectors)
  )
}

export const useConnectorsListProfiles = (connectorId?: string) => {
  const workspace = useWorkspace()
  return useQuery<ProfileConfig[]>(
    ['connector', 'listProfiles', connectorId, workspace],
    () =>
      request
        .post('/api/connectors/listProfiles', { connectorId, workspaceId: workspace.id })
        .then((res) => res.data.profiles),
    { enabled: !!connectorId }
  )
}

export const useConnectorsListAvailableConfigs = (connectorId?: string) => {
  const workspace = useWorkspace()
  return useQuery<
    {
      type: string
      configs: AvailableConfig[]
    }[]
  >(
    ['connector', 'listAvailableConfigs', connectorId, workspace],
    () =>
      request
        .post('/api/connectors/listAvailableConfigs', { connectorId, workspaceId: workspace.id })
        .then((res) => res.data.configs),
    {
      enabled: !!connectorId
    }
  )
}

export function useConnectorsUpsertProfile(connectorId: string) {
  const workspace = useWorkspace()
  const handleUpdateProfile = useCallback(
    (payload: ProfileConfig) =>
      request.post('/api/connectors/upsertProfile', { ...payload, workspaceId: workspace.id, connectorId }),
    [connectorId, workspace.id]
  )
  return useAsync(handleUpdateProfile)
}

/**
 * dbt start
 */

export function useGenerateKeyPair(
  connectorId: string,
  profile?: ProfileConfig,
  dbtProjectName?: string,
  gitUrl?: string
) {
  const workspace = useWorkspace()
  const handleGenerateKeyPair = useCallback(async () => {
    if (!profile || !dbtProjectName || !gitUrl) {
      return
    }
    await request.post('/api/connectors/upsertProfile', {
      ...profile,
      configs: { ...profile.configs, 'Dbt Project Name': dbtProjectName, 'Git Url': gitUrl },
      workspaceId: workspace.id,
      connectorId
    })
    await request.post('/api/connectors/dbt/generateKeyPair', {
      profile: profile.name,
      workspaceId: workspace.id,
      connectorId
    })
  }, [connectorId, dbtProjectName, gitUrl, profile, workspace.id])
  return useAsync(handleGenerateKeyPair)
}

export function useRevokeKeyPair(connectorId: string, profile?: ProfileConfig) {
  const workspace = useWorkspace()
  const handleRevokeKeyPair = useCallback(async () => {
    if (!profile) {
      return
    }
    delete profile.configs['Dbt Project Name']
    delete profile.configs['Git Url']
    delete profile.configs['Public Key']
    await request.post('/api/connectors/upsertProfile', {
      ...profile,
      configs: profile.configs,
      workspaceId: workspace.id,
      connectorId
    })
  }, [connectorId, profile, workspace.id])
  return useAsync(handleRevokeKeyPair)
}

export function usePushRepo(connectorId: string, profile?: string) {
  const workspace = useWorkspace()
  const handlePushRepo = useCallback(async () => {
    if (!profile) {
      return
    }
    await request.post('/api/connectors/dbt/pushRepo', {
      profile,
      workspaceId: workspace.id,
      connectorId
    })
  }, [connectorId, profile, workspace.id])
  return useAsync(handlePushRepo)
}

export function usePullRepo(connectorId: string, profile?: string) {
  const workspace = useWorkspace()
  const handlePullRepo = useCallback(async () => {
    if (!profile) {
      return
    }
    await request.post('/api/connectors/dbt/pullRepo', {
      profile,
      workspaceId: workspace.id,
      connectorId
    })
  }, [connectorId, profile, workspace.id])
  return useAsync(handlePullRepo)
}

/**
 * dbt end
 */

export const useAllThoughts = () => {
  const workspace = useWorkspace()
  const result = useQuery(['thought', 'loadAll', workspace], async () => {
    return request
      .post('/api/thought/loadAll', {
        workspaceId: workspace.id
      })
      .then((res) => {
        return res.data.thoughts as {
          id: string
          date: string
        }[]
      })
  })
  return result
}
