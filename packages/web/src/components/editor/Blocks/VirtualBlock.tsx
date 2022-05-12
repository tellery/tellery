import { createTranscation } from '@app/context/editorTranscations'
import { useCommit } from '@app/hooks/useCommit'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import React, { useRef } from 'react'
import type { Editor } from '@app/types'
import { useEditor } from '../hooks'

export const VirtualBlock: ReactFCWithChildren<{
  block: Editor.Block
}> = ({ block }) => {
  const commit = useCommit()
  const editor = useEditor()
  const ref = useRef<HTMLDivElement | null>(null)

  return (
    <>
      <div
        ref={ref}
        className={css`
          height: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          display: flex;
          padding: 30px;
          line-height: 1;
          font-size: 1em;
          background-color: ${ThemingVariables.colors.primary[5]};
          position: relative;
          cursor: pointer;
        `}
        // TODO: clear dirty data manually, delete it when app is stable
        onClick={() => {
          const currentBlock = ref.current?.closest('.tellery-block') as HTMLDivElement
          const closetParent = currentBlock?.parentElement?.closest('.tellery-block') as HTMLDivElement
          if (!closetParent || !closetParent.dataset.blockId) return
          commit({
            storyId: editor?.storyId!,
            transcation: createTranscation({
              operations: [
                {
                  cmd: 'listRemove',
                  args: { id: block.id },
                  id: closetParent.dataset.blockId,
                  path: ['children'],
                  table: 'block'
                }
              ]
            })
          })
        }}
      >
        <div>Virtual Block, this block shoud not be displayed, click to remove.</div>
      </div>
    </>
  )
}
