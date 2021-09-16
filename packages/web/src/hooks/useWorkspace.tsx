import { getWorkspaceList } from '@app/api'
import { Workspace } from '@app/types'
import { atom, selector, useRecoilValue, useSetRecoilState } from 'recoil'

export const WorkspaceAtom = atom<Workspace>({
  key: 'workspace',
  default: selector({
    key: 'workspace/Default',
    get: async ({ get }) => {
      const workspaces = await getWorkspaceList()
      return workspaces[0]
    },
    cachePolicy_UNSTABLE: {
      eviction: 'most-recent'
    }
  })
})

export const WorkspaceIdAtom = selector<string | null>({
  key: 'workspaceId',
  get: ({ get }) => {
    const workspace = get(WorkspaceAtom)
    return workspace?.id ?? null
  }
})

export const useSetWorkspaceState = () => {
  return useSetRecoilState(WorkspaceAtom)
}

export const useWorkspace = () => {
  const workspace = useRecoilValue(WorkspaceAtom)
  return workspace
}

export const useWorkspaceId = () => {
  return useRecoilValue(WorkspaceIdAtom)
}
