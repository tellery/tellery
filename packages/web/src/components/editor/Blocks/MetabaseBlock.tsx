import IframeResizer from 'iframe-resizer-react'
import React, { useCallback, useRef, useState, useMemo } from 'react'

import { Editor } from 'types'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { EmbedBlockPopover } from '../BlockBase/EmbedBlockPopover'
import { BlockFormatInterface, useEditor } from '../hooks'
import { BlockComponent, registerBlock } from './utils'

const MetabaseBlock: BlockComponent<
  React.FC<{
    block: Editor.MetabaseBlock
    blockFormat: BlockFormatInterface
    parentType: Editor.BlockType
  }>
> = ({ block, blockFormat, parentType }) => {
  const ref = useRef<HTMLDivElement>(null)

  const editor = useEditor<Editor.MetabaseBlock>()
  const [showPopover, setShowPopover] = useState(false)

  const token = useMemo(() => {
    return block.content?.publicToken
  }, [block.content?.publicToken])

  const iframeUrl = useMemo(() => {
    return `${block.content.siteUrl}/${block.content.publicToken ? 'public' : 'embed'}/${
      block.content.resourceType
    }/${token}#bordered=true&titled=true";`
  }, [block.content.publicToken, block.content.resourceType, block.content.siteUrl, token])

  return (
    <>
      <div ref={ref}>
        {block.content.siteUrl ? (
          <>
            <IframeResizer log src={iframeUrl} style={{ width: '1px', minWidth: '100%', border: 'none' }} />
          </>
        ) : (
          <BlockPlaceHolder
            text="Input public dashboard URL"
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
              editor?.setBlockValue(block.id, (oldValue) => {
                const url = new URL(src)
                oldValue.content.siteUrl = `${url.protocol}//${url.host}`
                const pathParts = url.pathname.split('/').slice(1)
                console.log(pathParts)
                if (pathParts[0] === 'public') {
                  oldValue.content.resourceType = pathParts[1]
                  oldValue.content.publicToken = pathParts[2]
                } else if (pathParts[0] === 'embed') {
                  oldValue.content.resourceType = pathParts[1]
                  oldValue.content.resourceId = parseInt(pathParts[2], 10)
                  oldValue.content.params = {}
                } else {
                  return
                }
                setShowPopover(false)
              })
            },
            [block.id, editor]
          )}
        />
      </div>
    </>
  )
}

MetabaseBlock.meta = {
  isText: false,
  hasChildren: false,
  supportBlockFormat: false
}
registerBlock(Editor.BlockType.Metabase, MetabaseBlock)
