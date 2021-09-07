import { atom, useRecoilState, useSetRecoilState } from 'recoil'

export interface ActionInterface {
  type: string
  action: Function
}
const PastedActions = atom<ActionInterface[]>({ default: [], key: 'PastedActions' })

export const useSetPastedActions = () => {
  return useSetRecoilState(PastedActions)
}

export const usePastedActionsState = () => {
  return useRecoilState(PastedActions)
}
