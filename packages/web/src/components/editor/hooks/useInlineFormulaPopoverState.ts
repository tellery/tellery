import { atom, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil'

const InlineFormulaPopoverAtom = atom({ key: 'InlineFormulaPopoverAtom', default: false })

export const useInlineFormulaPopoverState = () => {
  return useRecoilState(InlineFormulaPopoverAtom)
}

export const useSetInlineFormulaPopoverState = () => {
  return useSetRecoilState(InlineFormulaPopoverAtom)
}

export const useInlineFormulaPopoverStateValue = () => {
  return useRecoilValue(InlineFormulaPopoverAtom)
}
