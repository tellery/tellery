import { useStoriesSearch } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { Editor } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { waitForTranscationApplied } from '@app/utils/oberveables'
import { css } from '@emotion/css'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { useMoveOrSaveToStory } from '../../hooks/useMoveOrSaveToStory'
import { useGetBlockTitleTextSnapshot } from '../editor'
import { StyledDropDownItem, StyledDropdownMenuContent } from '../kit/DropDownMenu'
import { SearchInput } from './SearchInput'

export const SaveOrMoveToStorySubMenu: ReactFCWithChildren<{
  blockFragment: { children: string[]; data: Record<string, Editor.BaseBlock> } | null
  className?: string
  trigger: ReactNode
  mode: 'save' | 'move'
}> = ({ blockFragment, mode, trigger }) => {
  const saveOrMoveToStory = useMoveOrSaveToStory(blockFragment, mode)
  const [open, setOpen] = useState(false)
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const { data, fetchNextPage, status, hasNextPage, isLoading, isFetchingNextPage } = useStoriesSearch(keyword)
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const blockTranscations = useBlockTranscations()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      const element = ref.current
      const scrollListenser = (e: any) => {
        if (!e.currentTarget) return
        if (
          hasNextPage &&
          status !== 'loading' &&
          e.currentTarget.clientHeight + e.currentTarget.scrollTop + 100 >= e.currentTarget.scrollHeight
        ) {
          fetchNextPage()
        }
      }
      element.addEventListener('scroll', scrollListenser, { passive: true })
      return () => {
        element.removeEventListener('scroll', scrollListenser)
      }
    }
  }, [fetchNextPage, hasNextPage, status])

  const items = useMemo(
    () =>
      data?.pages
        .map(({ results }) =>
          results.searchResults.map((storyId) => {
            const story = results.blocks[storyId]
            return {
              id: story.id,
              originTitle: getBlockTitle(story)
            }
          })
        )
        .flat() || [],
    [data?.pages, getBlockTitle]
  )

  const hasExactSame = useMemo(() => {
    if (items?.length === 0) return false
    return items?.some((item) => item.originTitle === keyword)
  }, [keyword, items])

  const createNewStoryAndMoveTo = useCallback(
    async (title: string) => {
      const newStoryId = blockIdGenerator()
      const [transcationId] = await blockTranscations.createNewStory({ id: newStoryId, title })
      await waitForTranscationApplied(transcationId)
      await saveOrMoveToStory(newStoryId)
    },
    [blockTranscations, saveOrMoveToStory]
  )

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(open) => {
        setOpen(open)
      }}
    >
      {trigger}
      <StyledDropdownMenuContent
        open={open}
        className={css`
          padding: 0;
        `}
      >
        <SearchInput
          onChange={(e) => {
            setKeyword(e.currentTarget.value)
          }}
          placeholder={t<string>(`Search`)}
        />
        <div
          className={css`
            overflow-y: auto;
            height: 300px;
            padding: 4px 10px;
          `}
          ref={ref}
        >
          {hasExactSame === false && keyword.length > 1 && (
            <StyledDropDownItem
              title={`Create ${keyword}`}
              onClick={async () => {
                await createNewStoryAndMoveTo(keyword)
                if (mode === 'save') {
                  toast.success('Saved to story')
                } else {
                  toast.success('Moved to story')
                }
              }}
            />
          )}
          {items.map((item) => {
            return (
              <StyledDropDownItem
                key={item.id}
                title={item.originTitle}
                onClick={async () => {
                  await saveOrMoveToStory(item.id)
                  if (mode === 'save') {
                    toast.success('Saved to story')
                  } else {
                    toast.success('Moved to story')
                  }
                }}
              />
            )
          })}
        </div>

        <DropdownMenu.Arrow />
      </StyledDropdownMenuContent>
    </DropdownMenu.Root>
  )
}
