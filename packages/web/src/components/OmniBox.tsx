import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { css, cx } from '@emotion/css'
import { IconCommonAdd, IconCommonSearch, IconMiscNoResult } from '@app/assets/icons'
import { useGetBlockTitleTextSnapshot } from '@app/components/editor'
import dayjs from 'dayjs'
import { useOpenStory } from '@app/hooks'
import { useSearchBlocks } from '@app/hooks/api'
import { useAtom } from 'jotai'
import { compact } from 'lodash'
import { nanoid } from 'nanoid'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { omniboxShowState } from '@app/store'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { CircularLoading } from './CircularLoading'
import { OmniBoxItem, ResultType } from './OmniBoxItem'
import { SmallStory } from './SmallStory'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { isQuestionLikeBlock } from './editor/Blocks/utils'

const PAGE_LIMIT = 51

export function OmniBox() {
  const router = useHistory()
  const [show, setShow] = useAtom(omniboxShowState)
  const [keyword, setKeyword] = useState('')
  const { data, isLoading } = useSearchBlocks(keyword, PAGE_LIMIT, undefined, { enabled: !!keyword })
  const [activeIndex, setActiveIndex] = useState(0)
  const openStoryHandler = useOpenStory()
  const blockTranscations = useBlockTranscations()

  const handleOpenStory = useCallback(
    (storyId: string, blockId: string | undefined, alt: boolean, meta: boolean) => {
      if (meta) {
        window.open(`/story/${storyId}${blockId ? `#${blockId}` : ''}`, '_blank')
      } else {
        openStoryHandler(storyId, { blockId, isAltKeyPressed: alt })
      }
    },
    [openStoryHandler]
  )

  const handleCreateNewSotry = useCallback(async () => {
    const storyId = nanoid()
    await blockTranscations.createNewStory({ id: storyId, title: keyword })
    return storyId
  }, [blockTranscations, keyword])

  useEffect(() => {
    setActiveIndex(0)
  }, [data])

  const getBlockTitle = useGetBlockTitleTextSnapshot()

  const items = useMemo(() => {
    if (!keyword || !data) {
      return []
    }
    return compact(
      data.searchResults.map((id) => {
        const block = data.blocks[id]
        if (!block) {
          return undefined
        }
        if (block.type === Editor.BlockType.Story) {
          return {
            id: block.id,
            storyId: block.id,
            type: ResultType.STORY,
            text: getBlockTitle(block),
            html: data.highlights[block.id],
            subText: dayjs(block.updatedAt).format('YYYY-MM-DD')
          }
        }
        if (isQuestionLikeBlock(block.type)) {
          return {
            id: block.id,
            storyId: block.storyId,
            type: ResultType.QUESTION,
            text: (block as Editor.SQLBlock).content?.sql,
            html: data.highlights[block.id],
            subText: getBlockTitle(block)
          }
        }
        return {
          id: block.id,
          storyId: block.storyId,
          type: ResultType.BLOCK,
          text: getBlockTitle(block),
          html: data.highlights[block.id],
          subText: block.storyId ? getBlockTitle(data.blocks[block.storyId]) : ''
        }
      })
    )
  }, [data, keyword, getBlockTitle])
  const activeIndexMod = data ? Math.min(items.length, PAGE_LIMIT) + 1 : 1
  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      if (!show) {
        if (e.metaKey && e.key === 'k') {
          setShow(true)
        } else {
          return
        }
      }
      if (e.metaKey && e.key === 'k') {
        setShow(!show)
      } else if (e.key === 'Escape') {
        if (keyword) {
          setKeyword('')
        } else {
          setShow(false)
        }
      } else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        setActiveIndex((old) => (old + 1) % activeIndexMod)
        e.preventDefault()
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        setActiveIndex((old) => (old - 1 + activeIndexMod) % activeIndexMod)
        e.preventDefault()
      } else if (e.key === 'Enter') {
        const item = items[activeIndex]
        if (activeIndex === PAGE_LIMIT - 1) {
          router.push(`/stories?s=${keyword}`)
        } else if (item?.storyId) {
          if (item.type === ResultType.STORY) {
            handleOpenStory(item.storyId, undefined, e.altKey, e.metaKey)
          } else {
            handleOpenStory(item.storyId, item.id, e.altKey, e.metaKey)
          }
        } else if (activeIndex === activeIndexMod - 1) {
          handleOpenStory(await handleCreateNewSotry(), undefined, e.altKey, e.metaKey)
        }
        setShow(false)
      }
      e.stopPropagation()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, activeIndexMod, handleCreateNewSotry, handleOpenStory, items, keyword, router, setShow, show])
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (show) {
      inputRef.current?.focus()
    } else {
      inputRef.current?.blur()
      setActiveIndex(0)
      setKeyword('')
    }
  }, [show])

  return (
    <div
      className={css`
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 9999999999;
        transition: opacity 0.2s;
      `}
      style={{
        pointerEvents: show ? 'auto' : 'none',
        opacity: show ? 1 : 0
      }}
      onClick={() => {
        setShow(false)
      }}
    >
      <div
        ref={ref}
        className={cx(
          css`
            width: 700px;
            margin: 10vh;
            transition: filter 0.2s;
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 12px;
            overflow: hidden;
            background: ${ThemingVariables.colors.gray[5]};
            display: flex;
            flex-direction: column;
          `,
          keyword
            ? css`
                height: 80vh;
              `
            : undefined
        )}
        style={{
          filter: show ? 'blur(0)' : 'blur(20px)'
        }}
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <div
          className={css`
            flex-shrink: 0;
            height: 60px;
            width: 100%;
            padding: 8px 15px;
            display: flex;
            align-items: center;
          `}
        >
          <div
            className={css`
              flex-shrink: 0;
              line-height: 0;
            `}
          >
            {isLoading ? (
              <CircularLoading size={20} color={ThemingVariables.colors.text[0]} scale={0.75} />
            ) : (
              <IconCommonSearch />
            )}
          </div>
          <input
            ref={inputRef}
            autoFocus={true}
            className={css`
              margin-left: 10px;
              width: 100%;
              color: ${ThemingVariables.colors.text[0]};
              border: none;
              outline: none;
              font-size: 16px;

              &::placeholder {
                font-size: 16px;
                color: ${ThemingVariables.colors.gray[0]};
              }
            `}
            placeholder="Search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
            }}
          />
        </div>
        {keyword ? (
          <div
            className={css`
              height: 0;
              flex: 1;
              border-top: solid 1px ${ThemingVariables.colors.gray[1]};
              display: flex;
            `}
          >
            <PerfectScrollbar
              className={css`
                flex: 1;
                width: 0;
                padding: 12px 12px 4px 12px;
                height: 100%;
              `}
              options={{ suppressScrollX: true }}
            >
              {items?.length ? (
                items.map((item, index) =>
                  index === PAGE_LIMIT - 1 ? (
                    <OmniBoxItem
                      key="more"
                      item={{ id: 'more', type: ResultType.MORE, text: 'Search in all stories', subText: keyword }}
                      active={index === activeIndex}
                      setActive={() => {
                        setActiveIndex(index)
                      }}
                      onClick={() => {
                        router.push(`/stories?s=${keyword}`)
                        setShow(false)
                      }}
                    />
                  ) : (
                    <OmniBoxItem
                      key={item.type + item.id}
                      item={item}
                      active={index === activeIndex}
                      setActive={() => {
                        setActiveIndex(index)
                      }}
                      onClick={(e) => {
                        if (item.storyId) {
                          if (item.type === ResultType.STORY) {
                            handleOpenStory(item.storyId, undefined, e.altKey, e.metaKey)
                          } else {
                            handleOpenStory(item.storyId, item.id, e.altKey, e.metaKey)
                          }
                        }
                        setShow(false)
                      }}
                    />
                  )
                )
              ) : isLoading ? null : (
                <div
                  className={css`
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                  `}
                >
                  <IconMiscNoResult />
                  <span
                    className={css`
                      margin-top: 10px;
                      color: ${ThemingVariables.colors.primary[1]};
                      opacity: 0.3;
                    `}
                  >
                    No Search Result
                  </span>
                </div>
              )}
            </PerfectScrollbar>
            {items?.length ? (
              <div
                className={css`
                  flex-shrink: 0;
                  width: 280px;
                  background-color: ${ThemingVariables.colors.gray[3]};
                  margin: 12px 12px 12px 0;
                  padding: 0 12px;
                  border-radius: 8px;
                  overflow: hidden;
                `}
              >
                {items[activeIndex]?.storyId ? (
                  <SmallStory
                    className={css`
                      height: 100%;
                    `}
                    color={ThemingVariables.colors.gray[3]}
                    storyId={items[activeIndex].storyId!}
                    blockId={items[activeIndex].type !== ResultType.MORE ? items[activeIndex].id : undefined}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {keyword ? (
          <div
            className={css`
              flex-shrink: 0;
              padding: 0 15px;
              cursor: pointer;
              &:active {
                background-color: ${ThemingVariables.colors.primary[4]};
              }
            `}
            style={
              activeIndex === activeIndexMod - 1 ? { backgroundColor: ThemingVariables.colors.primary[4] } : undefined
            }
            onClick={async (e) => {
              handleOpenStory(await handleCreateNewSotry(), undefined, e.altKey, e.metaKey)
              setShow(false)
            }}
            onMouseMove={() => {
              setActiveIndex(activeIndexMod - 1)
            }}
          >
            <div
              className={css`
                height: 44px;
                box-shadow: 0px -1px ${ThemingVariables.colors.gray[1]};
                display: flex;
                align-items: center;
              `}
            >
              <IconCommonAdd
                color={ThemingVariables.colors.text[2]}
                className={css`
                  flex-shrink: 0;
                  margin-right: 10px;
                `}
              />
              <span
                className={css`
                  font-weight: 400;
                  font-size: 14px;
                  color: ${ThemingVariables.colors.text[1]};
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                `}
              >
                Create a new story named &quot;
                <em
                  className={css`
                    font-style: normal;
                    font-weight: 600;
                    color: ${ThemingVariables.colors.text[0]};
                  `}
                >
                  {keyword}
                </em>
                &quot;
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
