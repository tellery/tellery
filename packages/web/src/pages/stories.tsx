import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { DEFAULT_TITLE } from '@app/utils'
import { css, cx } from '@emotion/css'
import { IconCommonSearch } from '@app/assets/icons'
import { useGetBlockTitleTextSnapshot } from '@app/components/editor'
import { StoryListItem, StoryListItemValue } from '@app/components/StoryListItem'
import { AnimateSharedLayout, motion } from 'framer-motion'
import { useSearchParams } from '@app/hooks'
import { useStoriesSearch, useWorkspaceView } from '@app/hooks/api'
import { SVG2DataURI } from '@app/lib/svg'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet'
import mergeRefs from 'react-merge-refs'
import AutoSizer from 'react-virtualized-auto-sizer'
import { areEqual, ListChildComponentProps, ListOnScrollProps, VariableSizeList } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { ThemingVariables } from '@app/styles'
import { NewStoryButton } from '@app/components/NewStoryButton'

const RenderItem = memo(function Item({ index, style, data }: ListChildComponentProps) {
  const { isItemLoaded, isFooter, items, workspaceView, refetch, refetchWorkspaceView, large, width } = data
  const blockTranscation = useBlockTranscations()
  if (!isItemLoaded(index) || isFooter(index)) {
    return (
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.5,
          ...style
        }}
      >
        {index >= items.length ? 'End' : 'Loading'}
      </div>
    )
  }
  const item = items[index]!
  return (
    <StoryListItem
      value={item}
      style={style}
      large={large}
      width={width}
      onStarClicked={async () => {
        if (!workspaceView) {
          return
        }
        if (item.isPinned) {
          await blockTranscation.unpinStory(workspaceView.id, item.id)
        } else {
          await blockTranscation.pinStory(workspaceView.id, item.id)
        }
        await refetch()
        await refetchWorkspaceView()
      }}
      onTrashClicked={async () => {
        if (confirm(`Delete story: ${item.title}`)) {
          await blockTranscation.deleteStory(item.id)
          await refetch()
          await refetchWorkspaceView()
        }
      }}
    />
  )
}, areEqual)

const Page = () => {
  const searchParams = useSearchParams()
  const s = (searchParams.get('s') as string) ?? ''
  const [keyword, setKeyword] = useState('')
  useEffect(() => {
    if (s) {
      setKeyword(s)
    }
  }, [s])
  const getBlockTitle = useGetBlockTitleTextSnapshot()
  const { data, fetchNextPage, refetch } = useStoriesSearch(keyword)
  const { data: workspaceVirew } = useWorkspaceView()
  const items = useMemo<StoryListItemValue[]>(
    () =>
      data?.pages
        .map(({ results }) =>
          results.searchResults.map((storyId) => {
            const story = results.blocks[storyId]
            const block = story.children?.find((id) => results.highlights[id])
            const highlight = Object.entries(results.highlights).find(
              ([id]) => results.blocks[id].storyId === storyId && id !== storyId
            )
            return {
              id: story.id,
              title: results.highlights[story.id].trim().length ? results.highlights[story.id] : DEFAULT_TITLE,
              originTitle: getBlockTitle(story),
              updatedAt: story.updatedAt,
              highlight: block
                ? {
                    id: block,
                    text: results.highlights[block],
                    originText: getBlockTitle(results.blocks[block])
                  }
                : highlight
                ? {
                    id: highlight[0],
                    text: highlight[1],
                    originText: getBlockTitle(results.blocks[highlight[0]])
                  }
                : undefined,
              user: results.users[story.createdById!],
              relatedStories: results.links[storyId].map((id) => results.blocks[id]),
              isPinned: !!workspaceVirew?.pinnedList.includes(storyId)
            }
          })
        )
        .flat() || [],
    [data?.pages, getBlockTitle, workspaceVirew?.pinnedList]
  )
  const isItemLoaded = useCallback((index: number) => !!items[index], [items])
  const isFooter = useCallback((index: number) => index === items.length, [items])
  const { data: workspaceView, refetch: refetchWorkspaceView } = useWorkspaceView()
  // eslint-disable-next-line react/display-name
  const [sticky, setSticky] = useState(false)
  const handleScroll = useCallback(
    (e: ListOnScrollProps) => {
      if (sticky !== e.scrollOffset > 0) {
        setSticky(e.scrollOffset > 0)
      }
    },
    [sticky]
  )
  const large = !!keyword
  const listRef = useRef<VariableSizeList>(null)
  useEffect(() => {
    listRef.current?.resetAfterIndex(0)
  }, [large])
  const [width, setWidth] = useState(0)

  return (
    <>
      <Helmet>
        <title>All Stories - Tellery</title>
      </Helmet>
      <AnimateSharedLayout>
        <div
          className={css`
            position: relative;
            height: 100%;
          `}
        >
          <div
            className={css`
              background: ${ThemingVariables.colors.gray[5]};
              position: absolute;
              top: 0;
              width: 100%;
              z-index: 100;
            `}
          >
            <div
              className={cx(
                css`
                  width: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                `,
                sticky
                  ? css`
                      flex-direction: row;
                      box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.08);
                      height: 76px;
                      padding: 0 120px;
                    `
                  : css`
                      flex-direction: column;
                      margin-bottom: 40px;
                    `
              )}
            >
              <motion.h1
                layoutId="title"
                className={cx(
                  sticky
                    ? css`
                        font-size: 24px;
                        line-height: 30px;
                        font-weight: 500;
                      `
                    : css`
                        font-size: 48px;
                        line-height: 59px;
                        font-weight: 700;
                        margin: 40px 0 20px;
                      `
                )}
              >
                All Stories
              </motion.h1>
              <motion.div
                layout="position"
                layoutId="input"
                className={css`
                  display: flex;
                `}
              >
                <input
                  autoFocus={true}
                  className={css`
                    flex-shrink: 0;
                    width: 500px;
                    height: 44px;
                    background: ${ThemingVariables.colors.gray[5]};
                    border: 1px solid ${ThemingVariables.colors.gray[1]};
                    outline: none;
                    box-sizing: border-box;
                    box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.08);
                    border-radius: 8px;
                    padding: 0 15px;
                    background-repeat: no-repeat;
                    background-position: calc(100% - 15px) 50%;

                    &::placeholder {
                      font-size: 16px;
                      color: ${ThemingVariables.colors.gray[0]};
                    }
                  `}
                  style={{ backgroundImage: SVG2DataURI(IconCommonSearch) }}
                  placeholder="Search"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value)
                  }}
                />
                <NewStoryButton
                  tipPlacement="bottom"
                  classname={css`
                    background: #ffffff;
                    border: 1px solid ${ThemingVariables.colors.gray[1]};
                    box-sizing: border-box;
                    border-radius: 8px;
                    height: 44px;
                    width: 44px;
                    display: flex;
                    margin-left: 10px;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.08);
                    cursor: pointer;
                  `}
                />
              </motion.div>
            </div>
            <motion.div
              layoutId="header"
              layout="position"
              className={css`
                font-weight: 500;
                font-size: 16px;
                height: 60px;
                line-height: 60px;
                box-shadow: 0px 1px 0px ${ThemingVariables.colors.gray[1]};
                display: flex;
                width: calc(100% - 240px);
                margin: 0 120px;
                & > div {
                  padding: 0 15px;
                  text-align: start;
                  vertical-align: middle;
                  display: inline-block;
                  flex-shrink: 0;
                }
              `}
            >
              <div
                className={css`
                  flex: 1;
                  width: 0;
                `}
              >
                Story
              </div>
              <div
                className={css`
                  width: 200px;
                `}
              >
                Owner
              </div>
              {width >= 960 ? (
                <div
                  className={css`
                    width: 200px;
                  `}
                >
                  Related Stories
                </div>
              ) : null}
              {width >= 1100 ? (
                <div
                  className={css`
                    width: 150px;
                  `}
                >
                  Last Modified
                </div>
              ) : null}
              <div
                className={css`
                  width: 90px;
                `}
              />
            </motion.div>
          </div>
          <div
            className={css`
              height: 100%;
              overflow: hidden;
            `}
          >
            <AutoSizer>
              {({ width, height }) => (
                <InfiniteLoader
                  minimumBatchSize={20}
                  isItemLoaded={isItemLoaded}
                  itemCount={items.length + 1}
                  loadMoreItems={async () => {
                    await fetchNextPage()
                  }}
                >
                  {({ onItemsRendered, ref }) => {
                    setWidth(width)
                    return (
                      <VariableSizeList
                        onScroll={handleScroll}
                        itemCount={items.length + 1}
                        itemData={{
                          isItemLoaded,
                          isFooter,
                          items,
                          workspaceView,
                          refetch,
                          refetchWorkspaceView,
                          large,
                          width
                        }}
                        onItemsRendered={onItemsRendered}
                        ref={mergeRefs([ref, listRef])}
                        width={width}
                        height={height}
                        itemSize={(index) => (index === 0 ? 264 : 0) + (large ? 92 : 60)}
                      >
                        {RenderItem}
                      </VariableSizeList>
                    )
                  }}
                </InfiniteLoader>
              )}
            </AutoSizer>
          </div>
        </div>
      </AnimateSharedLayout>
    </>
  )
}

export default Page
