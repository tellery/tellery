import IframeResizer from 'iframe-resizer-react'
import React, { useCallback, useRef, useState } from 'react'
import { Editor } from 'types'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { EmbedBlockPopover } from '../BlockBase/EmbedBlockPopover'
import { BlockFormatInterface, useEditor } from '../hooks'
import { BlockComponent, registerBlock } from './utils'

const EmbedBlock: BlockComponent<
  React.FC<{
    block: Editor.EmbedBlock
    blockFormat: BlockFormatInterface
    parentType: Editor.BlockType
  }>
> = ({ block, blockFormat, parentType }) => {
  const ref = useRef<HTMLDivElement>(null)

  const editor = useEditor<Editor.EmbedBlock>()
  const [showPopover, setShowPopover] = useState(false)

  return (
    <>
      <div ref={ref}>
        {block.content.src ? (
          <>
            <IframeResizer log src={block.content.src} style={{ width: '1px', minWidth: '100%', border: 'none' }} />
          </>
        ) : (
          <BlockPlaceHolder
            text="Uploading"
            loading={false}
            onClick={() => {
              setShowPopover(true)
            }}
          />
        )}

        <EmbedBlockPopover
          open={showPopover}
          setOpen={setShowPopover}
          referenceElement={ref.current}
          onSubmit={useCallback(
            ({ src }: { src: string }) => {
              setShowPopover(false)
              editor?.setBlockValue(block.id, (oldValue) => {
                oldValue.content.src = src
              })
            },
            [block.id, editor]
          )}
        />
      </div>
    </>
  )
}

EmbedBlock.meta = {
  isText: false,
  hasChildren: false,
  supportBlockFormat: true
}
registerBlock(Editor.BlockType.Embed, EmbedBlock)
