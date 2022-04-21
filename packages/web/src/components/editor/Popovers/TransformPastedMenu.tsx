import { nativeSelection2Tellery, TellerySelectionType } from '@app/components/editor/helpers/tellerySelection'
import { splitToken, tokenPosition2SplitedTokenPosition } from '@app/components/editor/helpers/tokenManipulation'
import { MenuItem } from '@app/components/MenuItem'
import { TippySingletonContextProvider } from '@app/components/TippySingletonContextProvider'
import { useBlockSuspense } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useEvent } from 'react-use'
import { isTextBlock } from '../Blocks/utils'
import { EditorPopover } from '../EditorPopover'
import { useEditor } from '../hooks'
import { usePastedActionsState } from '../hooks/usePastedActionsState'
import { useStorySelection } from '../hooks/useStorySelection'

export const TransformPastedMenu = (props: { storyId: string }) => {
  const [open, setOpen] = useState(false)
  const [selectionState] = useStorySelection(props.storyId)
  const [range, setRange] = useState<Range | null>(null)
  const [actions] = usePastedActionsState()

  useEvent(
    'selectionchange',
    useCallback(() => {
      const sel = document.getSelection()
      if (sel?.type === 'None') return
      const _range = sel?.getRangeAt(0)
      _range && setRange(_range)
    }, []),
    document
  )

  const currentBlockId = useMemo(() => {
    if (selectionState?.type === TellerySelectionType.Inline) {
      return selectionState.anchor.blockId
    }
    return null
  }, [selectionState])

  useEffect(() => {
    if (actions.length) {
      setOpen(true)
    }
  }, [actions])

  return (
    <EditorPopover
      open={open}
      setOpen={setOpen}
      placement="bottom-end"
      referenceElement={range}
      disableClickThrough
      lockBodyScroll
    >
      {open && range && currentBlockId && (
        <TransformPastedMenuInner currentBlockId={currentBlockId} setOpen={setOpen} range={range} />
      )}
    </EditorPopover>
  )
}

const TransformPastedMenuInner = ({
  setOpen,
  range,
  currentBlockId
}: {
  currentBlockId: string
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  range: Range | null
}) => {
  const [actions] = usePastedActionsState()
  const currentBlock = useBlockSuspense(currentBlockId)

  const tokenRange = useMemo(() => {
    if (range && currentBlock && isTextBlock(currentBlock.type)) {
      const selection = nativeSelection2Tellery(currentBlock)
      if (selection?.type !== TellerySelectionType.Inline) return
      const focus = selection?.focus
      const anchor = selection?.anchor
      const tokens = currentBlock?.content!.title
      if (!tokens || !focus || !anchor) return
      const start = tokenPosition2SplitedTokenPosition(tokens, anchor.nodeIndex, anchor?.offset) ?? 0
      const end = tokenPosition2SplitedTokenPosition(tokens, focus.nodeIndex, focus?.offset) ?? 0
      return { start, end }
    } else {
      setOpen(false)
      return null
    }
  }, [range, currentBlock, setOpen])

  return (
    <div
      onMouseDown={(e) => {
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.stopPropagation()
      }}
      className={css`
        outline: none;
        background: ${ThemingVariables.colors.gray[5]};
        box-shadow: ${ThemingVariables.boxShadows[0]};
        border-radius: 8px;
        display: flex;
        overflow: hidden;
        flex-direction: column;
        min-width: 260px;
        padding: 8px;
      `}
    >
      <TippySingletonContextProvider delay={500} arrow={false} placement="top">
        {actions.map((action) => {
          return (
            <MenuItem
              title={action.type}
              onClick={() => {
                action.action()
                setOpen(false)
              }}
              key={action.type}
            ></MenuItem>
          )
        })}
      </TippySingletonContextProvider>
    </div>
  )
}
