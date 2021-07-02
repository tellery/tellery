import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import { IconCommonAdd, IconCommonStory } from 'assets/icons'
import {
  mergeTokens,
  splitToken,
  tokenPosition2SplitedTokenPosition
} from 'components/editor/helpers/tokenManipulation'
import Icon from 'components/kit/Icon'
import { motion } from 'framer-motion'
import { useBlockSuspense, useSearchBlocks } from 'hooks/api'
import invariant from 'invariant'
import { nanoid } from 'nanoid'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import scrollIntoView from 'scroll-into-view-if-needed'
import { ThemingVariables } from 'styles'
import { Editor, TellerySelection, TellerySelectionType } from 'types'
import { BlockTitle } from '..'
import { EditorPopover } from '../EditorPopover'
import { tellerySelection2Native } from '../helpers/tellerySelection'
import { useEditor, useGetBlockTitleTextSnapshot } from '../hooks'
import { useEditableContextMenu } from '../hooks/useEditableContextMenu'
interface BlockReferenceDropDownInterface {
  open: boolean
  id: string
  keyword: string
  blockRef: React.MutableRefObject<HTMLDivElement | null>
  setOpen: (show: boolean) => void
  selection: TellerySelection | null
}

export const _BlockReferenceDropdown: React.FC<BlockReferenceDropDownInterface> = (props) => {
  const { id, keyword, open, setOpen, selection } = props
  const [referenceRange, setReferenceRange] = useState<null | Range | HTMLElement>(null)

  useEffect(() => {
    if (open) {
      invariant(selection, 'selection is null')
      setReferenceRange((_referenceRange) => {
        const range = tellerySelection2Native(selection)
        console.log('selection range', range, range?.getBoundingClientRect())
        invariant(range, 'range is null')
        // const _range = docSelection.rangeCount > 0 && docSelection.getRangeAt(0).cloneRange()
        // invariant(_range, 'selection not exist')
        if (range.getClientRects().length === 0) {
          return range.startContainer as HTMLElement
        } else {
          return range
        }
      })
    } else {
      setOpen(false)
      setReferenceRange(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setOpen])

  useEffect(() => {
    if (selection && selection.type === TellerySelectionType.Inline && open) {
      if (selection.focus.nodeIndex <= selection.anchor.nodeIndex && selection.focus.offset < selection.anchor.offset) {
        setOpen(false)
      }
    }
  }, [open, selection, setOpen])

  return (
    <EditorPopover open={open} setOpen={setOpen} referenceElement={referenceRange ?? null} placement="bottom-start">
      {referenceRange && open && (
        <_BlockReferenceDropdownInner {...props} open={!!(referenceRange && open)} referenceRange={referenceRange} />
      )}
    </EditorPopover>
  )

  // return <_BlockReferenceDropdownInner {...props} open={!!(referenceRange && open)} referenceRange={referenceRange} />
}

export const _BlockReferenceDropdownInner: React.FC<
  BlockReferenceDropDownInterface & { referenceRange: null | Range | HTMLElement }
> = (props) => {
  const { id, keyword, open, setOpen, blockRef, selection, referenceRange } = props
  const editor = useEditor<Editor.Block>()
  const currentBlock = useBlockSuspense(id)
  // const [referenceRange, setReferenceRange] = useState<null | Range>(null)

  const { data, isLoading } = useSearchBlocks(keyword, 10, Editor.BlockType.Story, {
    enabled: !!keyword,
    keepPreviousData: true
  })
  const stories = useMemo(
    () => (data && keyword ? data.searchResults.map((id) => data.blocks[id]) : []),
    [data, keyword]
  )

  const blockTranscations = useBlockTranscations()

  const searchResultClickHandler = useCallback(
    async (index) => {
      if (currentBlock?.content?.title) {
        const exec = async (currentBlock: Editor.Block) => {
          if (selection?.type === TellerySelectionType.Block) return
          const tokens = currentBlock?.content?.title ?? []
          const splitedTokens = splitToken(tokens)
          const textStart = tokenPosition2SplitedTokenPosition(
            tokens,
            selection!.anchor.nodeIndex,
            selection!.anchor.offset
          )

          const end = tokenPosition2SplitedTokenPosition(tokens, selection!.focus.nodeIndex, selection!.focus.offset)

          if (typeof textStart !== 'number' || typeof end !== 'number') {
            return
          }

          const start = textStart - 2
          const getNewToken = async (index: number): Promise<Editor.Token> => {
            if (index <= 0 || !stories) {
              const newStoryId = nanoid()
              const title = keyword ?? DEFAULT_TITLE
              await blockTranscations.createNewStory({ id: newStoryId, title })
              return [' ', [[Editor.InlineType.Reference, 's', `${newStoryId}`]]]
            } else {
              const referenceIndex = index - 1
              const story = stories[referenceIndex]
              return [' ', [[Editor.InlineType.Reference, 's', `${story.id}`]]]
            }
          }
          const newToken: Editor.Token = await getNewToken(index)
          splitedTokens.splice(start, end - start, newToken)
          const mergedTokens = mergeTokens(splitedTokens)

          editor?.setBlockValue?.(currentBlock.id, (block) => {
            if (block.content?.title !== undefined) {
              block!.content!.title = mergedTokens
            }
          })

          setOpen(false)
        }
        await exec({ ...currentBlock })
      }
    },
    [blockTranscations, currentBlock, editor, keyword, selection, setOpen, stories]
  )

  const getBlockTitle = useGetBlockTitleTextSnapshot()

  const hasExactSame = useMemo(() => {
    if (stories?.length === 0) return false
    return stories?.some((story) => getBlockTitle(story) === keyword)
  }, [keyword, stories, getBlockTitle])

  useEffect(() => {
    if (selection && selection.type === TellerySelectionType.Inline && open) {
      if (selection.focus.nodeIndex <= selection.anchor.nodeIndex && selection.focus.offset < selection.anchor.offset) {
        setOpen(false)
      }
    }
  }, [open, selection, setOpen])

  const items = useMemo(() => {
    const storyItems =
      stories?.map((story, index) => {
        const action = () => searchResultClickHandler(index + 1)
        return {
          id: story.id,
          view: (
            <>
              <div
                className={css`
                  width: 36px;
                  height: 36px;
                  border-radius: 4px;
                  margin-right: 10px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  flex-shrink: 0;
                `}
              >
                <IconCommonStory />
              </div>

              {story && (
                <div
                  className={css`
                    white-space: nowrap;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    flex-shrink: 1;
                  `}
                >
                  <BlockTitle block={story} />
                </div>
              )}
            </>
          ),
          action: action
        }
      }) ?? []

    if (hasExactSame === false) {
      const action = () => searchResultClickHandler(0)
      storyItems.unshift({
        id: 'create',
        view: (
          <>
            <div
              className={css`
                width: 36px;
                height: 36px;
                background: ${ThemingVariables.colors.primary[4]};
                border-radius: 4px;
                margin-right: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              `}
            >
              <Icon icon={IconCommonAdd} color={ThemingVariables.colors.primary[1]} />
            </div>
            Create {keyword}
          </>
        ),
        action: action
      })
    }

    return storyItems
  }, [hasExactSame, keyword, searchResultClickHandler, stories])

  const [currentIndex] = useEditableContextMenu(
    open,
    useMemo(() => items.map((item) => item.action), [items]),
    blockRef
  )

  return (
    <motion.div
      aria-label="Block Reference"
      className={css`
        outline: none;
        background: ${ThemingVariables.colors.gray[5]};
        box-shadow: ${ThemingVariables.boxShadows[0]};
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        max-height: 200px;
        width: 280px;
        overflow-x: hidden;
        overflow-y: auto;
        user-select: none;
        padding: 8px;
        font-weight: normal;
        & * + * {
          margin-top: 2px;
        }
      `}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {keyword ? (
        <>
          <div
            className={css`
              font-size: 12px;
              color: #888;
            `}
          >
            {keyword}
            <span>{isLoading && 'loading'}</span>
          </div>
          {items.map((item, index) => (
            <DropDownMenuItem key={item.id} onClick={item.action} active={currentIndex === index}>
              {item.view}
            </DropDownMenuItem>
          ))}
        </>
      ) : (
        <div
          className={css`
            font-size: 14px;
            line-height: 16px;
            color: ${ThemingVariables.colors.text[2]};
            padding: 14px 12px;
          `}
        >
          Search for a story
        </div>
      )}
    </motion.div>
  )
}

const DropDownMenuItem: React.FC<{ onClick: React.MouseEventHandler<HTMLDivElement>; active: boolean }> = ({
  children,
  onClick,
  active
}) => {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (active && ref.current) {
      scrollIntoView(ref.current, {
        scrollMode: 'always',
        block: 'center',
        inline: 'nearest'
      })
    }
  }, [active])

  return (
    <div
      ref={ref}
      onClick={onClick}
      data-active={active}
      className={css`
        background: transparent;
        border: none;
        cursor: pointer;
        border-radius: 8px;
        padding: 4px;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        font-size: 14px;
        line-height: 17px;
        cursor: pointer;
        padding: 4px;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        font-size: 14px;
        line-height: 17px;
        color: ${ThemingVariables.colors.text[0]};
        &:hover {
          background-color: ${ThemingVariables.colors.primary[4]} !important;
        }
        &:active,
        &[data-active='true'] {
          background-color: ${ThemingVariables.colors.primary[4]} !important;
        }
      `}
    >
      {children}
    </div>
  )
}
_BlockReferenceDropdown.whyDidYouRender = {
  logOnDifferentValues: true,
  customName: '_BlockReferenceDropdown'
}
export const BlockReferenceDropdown = memo(_BlockReferenceDropdown)
