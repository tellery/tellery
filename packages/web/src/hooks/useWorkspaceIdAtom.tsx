import { atom, useRecoilState } from 'recoil'

export const WorkspaceIdAtom = atom<string | null>({ key: 'workspaceId', default: null })

export const useWorkspaceIdState = () => {
  return useRecoilState(WorkspaceIdAtom)
}
