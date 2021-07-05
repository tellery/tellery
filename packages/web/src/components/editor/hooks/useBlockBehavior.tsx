import React, { useContext } from 'react'

export const BlockBehaviorConext = React.createContext<{
  readonly: boolean
  small: boolean
  draggable: boolean
  highlightedBlock?: string
  // BlockComponent:
  //   | React.NamedExoticComponent<{
  //       block: Editor.Block
  //       parentType: Editor.BlockType
  //     }>
  //   | React.FC<{
  //       block: Editor.Block
  //       parentType: Editor.BlockType
  //       hightlighted?: boolean | undefined
  //     }>
  //   | null
}>({
  readonly: false,
  highlightedBlock: undefined,
  small: false,
  draggable: false
})

export const useBlockBehavior = () => {
  const context = useContext(BlockBehaviorConext)
  return context
}
