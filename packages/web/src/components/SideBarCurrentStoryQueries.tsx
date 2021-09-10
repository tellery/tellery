import {
  IconCommonAdd,
  IconCommonBackLink,
  IconCommonDataAsset,
  IconCommonDbt,
  IconCommonLock,
  IconCommonSql,
  IconMenuImport
} from '@app/assets/icons'
import { createTranscation } from '@app/context/editorTranscations'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBindHovering } from '@app/hooks'
import { useBlockSuspense, useFetchStoryChunk, useSearchSQLQueries } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { useStoryResources } from '@app/hooks/useStoryResources'
import { useTippyMenuAnimation } from '@app/hooks/useTippyMenuAnimation'
import { ThemingVariables } from '@app/styles'
import { PopoverMotionVariants } from '@app/styles/animations'
import { Editor, Story, Thought } from '@app/types'
import { DEFAULT_TIPPY_DELAY } from '@app/utils'
import { DndItemDataBlockType, DnDItemTypes } from '@app/utils/dnd'
import { useDraggable } from '@dnd-kit/core'
import { css } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { AnimatePresence, motion } from 'framer-motion'
import React, { memo, ReactNode, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReactEventHandlers } from 'react-use-gesture/dist/types'
import { Popover, PopoverDisclosure, usePopoverState } from 'reakit'
import { BlockTitle, useGetBlockTitleTextSnapshot } from './editor'
import { isDataAssetBlock } from './editor/Blocks/utils'
import { useStoryQueryVisualizations } from './editor/hooks/useStoryQueryVisualizations'
import IconButton from './kit/IconButton'
import { LazyTippy } from './LazyTippy'
import { SearchInput } from './SearchInput'
import { SideBarInspectQueryBlockPopover } from './SideBarInspectQueryBlockPopover'
import { SideBarQueryItemDropdownMenu } from './SideBarQueryItemDropdownMenu'
import { SideBarSection } from './SideBarSection'
import { SideBarSectionHeader } from './SideBarSectionHeader'
import { TippySingletonContextProvider } from './TippySingletonContextProvider'

const StoryResources: React.FC<{ storyId: string }> = ({ storyId }) => {
  const resourceBlocks = useStoryResources(storyId)

  if (!storyId) return null

  return (
    <div
      className={css`
        flex: 1;
      `}
      // options={{ suppressScrollX: true }}
    >
      {resourceBlocks.map((block) => {
        return <StoryDataAssetItem key={block.id} blockId={block.id} storyId={storyId} />
      })}
    </div>
  )
}

export const CurrentStoryQueries: React.FC<{ storyId: string }> = ({ storyId }) => {
  useFetchStoryChunk<Story | Thought>(storyId)
  const { t } = useTranslation()

  return storyId ? (
    <React.Suspense fallback={<></>}>
      <SideBarSection>
        <SideBarSectionHeader>{t`Queries`}</SideBarSectionHeader>
        <Operations storyId={storyId} />
      </SideBarSection>
      <StoryResources storyId={storyId} />{' '}
    </React.Suspense>
  ) : null
}

const Operations: React.FC<{ storyId: string }> = ({ storyId }) => {
  const { t } = useTranslation()

  const permissions = useStoryPermissions(storyId)

  if (permissions.canWrite === false) return null

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        > * + * {
          margin-left: 16px;
        }
        > {
          padding: 8px 0;
        }
      `}
    >
      <TippySingletonContextProvider arrow={false}>
        <ImportOperation storyId={storyId} />
        <IconButton icon={IconCommonAdd} hoverContent={t`Create a new query`} />
      </TippySingletonContextProvider>
    </div>
  )
}

const ImportOperation: React.FC<{ storyId: string }> = ({ storyId }) => {
  const popover = usePopoverState({ placement: 'right-start', animated: true, modal: true })
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const { data } = useSearchSQLQueries(keyword, 10)
  const commit = useCommit()
  const importQueryToStory = useCallback(
    (blockId: string) => {
      commit({
        transcation: createTranscation({
          operations: [
            {
              cmd: 'listBefore',
              id: storyId,
              args: {
                id: blockId
              },
              table: 'block',
              path: ['resources']
            }
          ]
        }),
        storyId: storyId
      })
    },
    [commit, storyId]
  )

  return (
    <>
      <PopoverDisclosure
        as={IconButton}
        hoverContent={t`Import a query from other stories`}
        icon={IconMenuImport}
        {...popover}
      ></PopoverDisclosure>
      <Popover {...popover} aria-label="Welcome" className={css``}>
        <AnimatePresence>
          {popover.visible && (
            <motion.div
              initial={'inactive'}
              animate={'active'}
              exit={'inactive'}
              variants={PopoverMotionVariants.scale}
              transition={{ duration: 0.15 }}
              className={css`
                width: 360px;
                box-shadow: ${ThemingVariables.boxShadows[0]};
                background-color: ${ThemingVariables.colors.gray[5]};
                border-radius: 8px;
                margin: auto;
              `}
            >
              <div
                className={css`
                  padding: 18px;
                `}
              >
                <SearchInput
                  onChange={(e) => {
                    setKeyword(e.target.value)
                  }}
                  className={css``}
                />
              </div>
              <div
                className={css`
                  max-height: 300px;
                  overflow: auto;
                  padding: 0 18px;
                  padding-bottom: 10px;
                  > * + * {
                    margin-top: 10px;
                  }
                `}
              >
                {data?.searchResults.map((blockId) => {
                  const block = data?.blocks[blockId]
                  const story = data?.blocks[block.storyId!]
                  // if (storyResources?.includes(blockId)) return null
                  return (
                    <div
                      key={block.id}
                      className={css`
                        /* box-shadow: ${ThemingVariables.boxShadows[0]}; */
                        background-color: ${ThemingVariables.colors.gray[5]};
                        border-radius: 8px;
                        padding: 8px;
                        cursor: pointer;
                        :hover {
                          background-color: ${ThemingVariables.colors.primary[4]};
                        }
                        display: flex;
                        align-items: center;
                      `}
                      onClick={() => {
                        importQueryToStory(blockId)
                      }}
                    >
                      <div
                        className={css`
                          flex: 1;
                          overflow: hidden;
                        `}
                      >
                        <div
                          className={css`
                            color: ${ThemingVariables.colors.text[0]};
                            font-size: 14px;
                            display: flex;
                            align-items: center;
                            overflow: hidden;
                          `}
                        >
                          <IconCommonSql
                            className={css`
                              margin-right: 5px;
                            `}
                          />
                          <div
                            className={css`
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                            `}
                          >
                            <BlockTitle block={block} />
                          </div>
                        </div>
                        <div
                          className={css`
                            color: ${ThemingVariables.colors.text[2]};
                            margin-top: 5px;
                            font-size: 14px;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                          `}
                        >
                          <BlockTitle block={story} />
                        </div>
                      </div>
                      <div
                        className={css`
                          flex-shrink: 0;
                        `}
                      >
                        <IconCommonAdd />
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Popover>
    </>
  )
}

const _StoryDataAssetItemContentDraggable: React.FC<{
  storyId: string
  blockId: string
  hoveringHandlers: (...args: any[]) => ReactEventHandlers
  children: ReactNode
  isDataAssest?: boolean
}> = ({ hoveringHandlers, children, storyId, blockId, isDataAssest }) => {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `drag-${blockId}`,
    data: {
      type: DnDItemTypes.Block,
      originalBlockId: blockId,
      blockData: createEmptyBlock<Editor.VisualizationBlock>({
        type: Editor.BlockType.Visualization,
        storyId: storyId,
        parentId: storyId,
        content: isDataAssest
          ? {
              fromDataAssetId: blockId
            }
          : {
              queryId: blockId
            }
      })
    } as DndItemDataBlockType
  })

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 6px 8px;
        margin-bottom: 5px;
        :hover {
          background: ${ThemingVariables.colors.primary[5]};
        }
      `}
      {...listeners}
      {...attributes}
      {...hoveringHandlers()}
      ref={setNodeRef}
    >
      {children}
    </div>
  )
}

const StoryDataAssetItemContentDraggable = memo(_StoryDataAssetItemContentDraggable)

const StoryDataAssetItemContentInner: React.FC<{
  block: Editor.Block
  storyId: string
  blockId: string
  isHovering: boolean
}> = ({ block, storyId, blockId, isHovering }) => {
  const getBlockTitle = useGetBlockTitleTextSnapshot()

  const { t } = useTranslation()
  const IconType = useMemo(() => {
    if (block.storyId !== storyId) {
      return IconCommonBackLink
    }
    if (block.type === Editor.BlockType.SQL || block.type === Editor.BlockType.SnapshotBlock) {
      return IconCommonSql
    } else if (block.type === Editor.BlockType.QueryBuilder) {
      return IconCommonDataAsset
    } else if (block.type === Editor.BlockType.DBT) {
      return IconCommonDbt
    }
    return IconCommonSql
  }, [block.storyId, block.type, storyId])
  const queryVisualizations = useStoryQueryVisualizations(storyId, blockId)

  return (
    <>
      <IconType
        color={ThemingVariables.colors.gray[0]}
        className={css`
          flex-shrink: 0;
          margin: 0 8px;
        `}
      />

      <span
        className={css`
          font-size: 12px;
          line-height: 14px;
          flex: 1;
          color: ${ThemingVariables.colors.text[0]};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        `}
        style={{
          color: queryVisualizations.length ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[1]
        }}
      >
        {getBlockTitle(block)}
      </span>
      <div
        className={css`
          > * + * {
            margin-left: 16px;
          }
          display: flex;
          align-items: center;
        `}
      >
        {block.type === Editor.BlockType.SnapshotBlock && (
          <Tippy content={t`Frozen data`} arrow={false} placement="right">
            <div>
              <IconCommonLock color={ThemingVariables.colors.text[0]} width="16px" height="16px" />
            </div>
          </Tippy>
        )}
        <SideBarQueryItemDropdownMenu
          block={block}
          storyId={storyId}
          show={isHovering}
          visualizationsCount={queryVisualizations.length}
        />
      </div>
    </>
  )
}

const StoryDataAssetItemContent: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  const block = useBlockSuspense(blockId)
  const [hoveringHandlers, isHovering] = useBindHovering()

  return (
    <StoryDataAssetItemContentDraggable
      hoveringHandlers={hoveringHandlers}
      storyId={storyId}
      blockId={blockId}
      isDataAssest={isDataAssetBlock(block.type)}
    >
      <StoryDataAssetItemContentInner block={block} isHovering={isHovering} storyId={storyId} blockId={blockId} />
    </StoryDataAssetItemContentDraggable>
  )
}

const StoryDataAssetItem: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  return <StoryDataAssetItemContent blockId={blockId} storyId={storyId} />
}

const StoryDataAssetItemWithInspectPopover: React.FC<{ blockId: string; storyId: string }> = ({ blockId, storyId }) => {
  const tippyAnimation = useTippyMenuAnimation('fade')

  return (
    <LazyTippy
      render={(attrs) => (
        <motion.div animate={tippyAnimation.controls} {...attrs} transition={{ duration: 0.15 }}>
          <SideBarInspectQueryBlockPopover blockId={blockId}></SideBarInspectQueryBlockPopover>
        </motion.div>
      )}
      delay={DEFAULT_TIPPY_DELAY}
      hideOnClick={true}
      animation={true}
      onMount={tippyAnimation.onMount}
      onHide={(instance) => {
        tippyAnimation.onHide(instance)
      }}
      appendTo={document.body}
      interactive
      placement="right-end"
      zIndex={1000}
      // disabled
    >
      <span>
        <StoryDataAssetItemContent blockId={blockId} storyId={storyId} />
      </span>
    </LazyTippy>
  )
}
