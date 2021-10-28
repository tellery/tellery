import { IconCommonSearch } from '@app/assets/icons'
import { useStoriesSearch } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { css } from '@emotion/css'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { useMoveOrSaveToStory } from '../../hooks/useMoveOrSaveToStory'
import { useGetBlockTitleTextSnapshot } from '../editor'
import { StyledDropDownItem, StyledDropdownMenuContent } from '../kit/DropDownMenu'

export const SearchInput: React.FC<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
> = (props) => {
  return (
    <div
      className={css`
        position: relative;
        flex: 1;
        padding: 8px 10px;
        border-bottom: 1px solid ${ThemingVariables.colors.gray[1]};
      `}
    >
      <input
        {...props}
        className={css`
          flex-shrink: 0;
          width: 100%;
          height: 32px;
          background: ${ThemingVariables.colors.gray[5]};
          border: none;
          outline: none;
          box-sizing: border-box;
          padding-left: 36px;

          &::placeholder {
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.gray[0]};
          }
        `}
      ></input>
      <IconCommonSearch
        fill={ThemingVariables.colors.gray[0]}
        className={css`
          position: absolute;
          left: 18px;
          z-index: 999;
          top: 50%;
          color: ${ThemingVariables.colors.gray[0]};
          display: inline-block;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
        `}
      />
    </div>
  )
}

export const SaveOrMoveToStorySubMenu: React.FC<{
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

  const createNewStoryAndMoveTo = useCallback(
    async (title: string) => {
      const newStoryId = blockIdGenerator()
      await blockTranscations.createNewStory({ id: newStoryId, title })
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
          placeholder={t`Search`}
        />
        <div
          className={css`
            overflow-y: auto;
            height: 300px;
            padding: 4px 10px;
          `}
          ref={ref}
        >
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
