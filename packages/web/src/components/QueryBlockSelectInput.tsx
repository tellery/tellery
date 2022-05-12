import { StyledDropDownItem, StyledDropdownMenuContent } from '@app/components/kit/DropDownMenu'
import { SearchInput } from '@app/components/SearchInput'
import { useBlock, useGetBlock, useSearchBlocks } from '@app/hooks/api'
import { Editor } from '@app/types'
import { isBlockId, trasnformPasteBlockLinkToTransclusion } from '@app/utils'
import { css } from '@emotion/css'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import React, { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BlockTitle, blockTitleToText } from './editor'

export const QueryBlockSelectInput: ReactFCWithChildren<{
  onChange: (blockId: string) => void
  value: string | null
}> = ({ onChange, value }) => {
  const [keyword, setKeyword] = useState('')
  const [searchBlockId, setSearchBlockId] = useState<null | string>(null)
  const { data, isLoading } = useSearchBlocks(keyword, 10, Editor.BlockType.SQL, { suspense: false })
  const items = useMemo(() => {
    return (
      data?.searchResults
        .map((blockId) => {
          return data.blocks[blockId]
        })
        // TODO: search result should not return undefined
        .filter((item) => !!item) ?? []
    )
  }, [data?.blocks, data?.searchResults])

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const getBlock = useGetBlock()
  const { data: block } = useBlock(value ?? '')
  const { data: exactSearchBlock } = useBlock(searchBlockId ?? '')

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(open) => {
        setSearchBlockId(null)
        setOpen(open)
      }}
    >
      <DropdownMenu.Trigger
        className={css`
          outline: none;
          width: 100%;
          height: 100%;
          cursor: pointer;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          background: #fff;
          border: none;
          white-space: nowrap;
        `}
      >
        {value && block && <BlockTitle block={block} />}
      </DropdownMenu.Trigger>
      <StyledDropdownMenuContent
        open={open}
        className={css`
          padding: 0;
        `}
      >
        <div
          className={css`
            padding: 10px;
          `}
        >
          <SearchInput
            autoFocus
            onChange={(e) => {
              const value = e.currentTarget.value
              setKeyword(value)
              if (isBlockId(value) === false) {
                setSearchBlockId(null)
              }
            }}
            placeholder={t<string>(`Search`)}
            onPaste={async (e) => {
              e.stopPropagation()
              const text = e.clipboardData.getData('text/plain')
              const transclustionId = await trasnformPasteBlockLinkToTransclusion(text, getBlock)
              if (transclustionId) {
                e.preventDefault()
                document.execCommand('insertText', false, transclustionId ?? '')
                setSearchBlockId(transclustionId)
              }
            }}
          />
        </div>
        <div
          className={css`
            overflow-y: auto;
            height: 300px;
            padding: 4px 10px;
          `}
          ref={ref}
        >
          {searchBlockId && exactSearchBlock && (
            <StyledDropDownItem
              title={blockTitleToText(exactSearchBlock)}
              onClick={() => {
                onChange(searchBlockId)
              }}
            />
          )}
          {items.map((item) => {
            return (
              <StyledDropDownItem
                key={item.id}
                title={blockTitleToText(item)}
                onClick={async () => {
                  onChange(item.id)
                }}
              />
            )
          })}
        </div>
      </StyledDropdownMenuContent>
    </DropdownMenu.Root>
  )
}
