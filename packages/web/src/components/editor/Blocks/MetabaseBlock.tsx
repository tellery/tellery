import { getMetabaseToken } from '@app/api'
import { Editor } from '@app/types'
import IframeResizer from 'iframe-resizer-react'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useQuery } from 'react-query'
import { BlockPlaceHolder } from '../BlockBase/BlockPlaceHolder'
import { EmbedBlockPopover } from '../BlockBase/EmbedBlockPopover'
import { BlockFormatInterface, useEditor } from '../hooks'
import { BlockComponent, registerBlock } from './utils'

const useMetabaseToken = (block: Editor.MetabaseBlock) => {
  const { data: token } = useQuery({
    queryKey: [
      'metabasetoken',
      block.content.siteUrl,
      block.content.publicToken,
      block.content.resourceType,
      block.content.resourceId
    ],
    queryFn: () => {
      if (!block.content.resourceType || !block.content.resourceType || !block.content.siteUrl) {
        return
      }
      return getMetabaseToken({
        siteUrl: block.content.siteUrl,
        payload: {
          resource: {
            [block.content.resourceType]: block.content.resourceId
          },
          params: {}
        }
      }).then((res) => res.data.token as string)
    },
    enabled: !!(block.content.siteUrl && block.content.publicToken === undefined)
  })

  if (block.content.publicToken) {
    return block.content.publicToken
  }

  return token
}

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

  const token = useMetabaseToken(block)

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
            text="Input Metabase dashboard/question URL"
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
                if (pathParts.length === 3) {
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
                } else if (pathParts.length === 2) {
                  oldValue.content.resourceType = pathParts[0]
                  oldValue.content.resourceId = parseInt(pathParts[1], 10)
                  oldValue.content.params = {}
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
