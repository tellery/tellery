import React, { useContext } from 'react'

export const BlockBehaviorConext = React.createContext<{
  readonly: boolean
  small: boolean
  draggable: boolean
  highlightedBlockId?: string
  // BlockComponent:
  //   | React.NamedExoticComponent<{
  //       block: Editor.Block
  //       parentType: Editor.BlockType
  //     }>
  //   | ReactFCWithChildren<{
  //       block: Editor.Block
  //       parentType: Editor.BlockType
  //       hightlighted?: boolean | undefined
  //     }>
  //   | null
}>({
  readonly: false,
  small: false,
  draggable: false,
  highlightedBlockId: undefined
})

export const useBlockBehavior = () => {
  const context = useContext(BlockBehaviorConext)
  return context
}
