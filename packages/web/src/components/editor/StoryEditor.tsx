import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useBlockSuspense, useFetchStoryChunk, useGetBlock } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { Operation, useCommit, useCommitHistory } from '@app/hooks/useCommit'
import { useFetchBlock } from '@app/hooks/useFetchBlock'
import { usePushFocusedBlockIdState } from '@app/hooks/usePushFocusedBlockIdState'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { useSelectionArea } from '@app/hooks/useSelectionArea'
import { useSetSideBarRightState } from '@app/hooks/useSideBarQuestionEditor'
import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor, Story, Thought } from '@app/types'
import { isUrl, TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx } from '@emotion/css'
import debug from 'debug'
import { dequal } from 'dequal'
import { motion } from 'framer-motion'
import isHotkey from 'is-hotkey'
import React, { CSSProperties, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useClickAway, useEvent, useScrollbarWidth } from 'react-use'
import { Button } from 'reakit'
import scrollIntoView from 'scroll-into-view-if-needed'
import invariant from 'tiny-invariant'
import {
  addMark,
  applyTransformOnTokensFromSelectionState,
  isSelectionAtStart,
  isSelectionCollapsed,
  isSelectionCrossBlock,
  mergeTokens,
  splitBlockTokens,
  splitToken
} from '.'
import { ThoughtItemHeader } from '../ThoughtItem'
import {
  isBlockHasChildren,
  isQueryBlock,
  isQuestionLikeBlock,
  isTextBlock,
  isVisualizationBlock
} from './Blocks/utils'
import { ContentBlocks } from './ContentBlock'
import {
  canOutdention,
  createTranscation,
  findPreviouseBlock,
  findPreviousTextBlock,
  findRootBlock,
  getBlockElementContentEditbleById,
  getDuplicatedBlocksFragment,
  getElementEndPoint,
  getElementStartPoint,
  getEndContainerFromPoint,
  getIndentionOperations,
  getNextTextBlockElement,
  getOutdentionOperations,
  getPreviousTextBlockElement,
  getRangeFromPoint,
  getTransformedSelection,
  getTransformedTypeAndPrefixLength,
  insertBlockAfterTranscation,
  insertBlocksAndMoveOperations,
  isCaretAtEnd,
  isCaretAtStart,
  isSelectionAtFirstLine,
  isSelectionAtLastLine,
  restoreRange,
  setCaretToEnd,
  setCaretToStart,
  TellerySelection,
  TellerySelectionType
} from './helpers'
import { EditorContext, EditorContextInterface, useMouseMoveInEmitter } from './hooks'
import { BlockAdminContext, useBlockAdminProvider } from './hooks/useBlockAdminProvider'
import { useBlockHoveringState } from './hooks/useBlockHovering'
import { useGetBlockLocalPreferences } from './hooks/useBlockLocalPreferences'
import { useDebouncedDimension } from './hooks/useDebouncedDimensions'
import { useStorySelection } from './hooks/useStorySelection'
import { useSetUploadResource } from './hooks/useUploadResource'
import { notifyUrlPasted } from './oberveables'
import { BlockTextOperationMenu } from './Popovers/BlockTextOperationMenu'
import { TransformPastedMenu } from './Popovers/TransformPastedMenu'
import { StoryBlockOperatorsProvider } from './StoryBlockOperatorsProvider'
import { useEditorClipboardManager } from './hooks/useEditorClipboardManager'
import { useHandleUrlPasted } from './hooks/useHandleUrlPasted'
import { getFilteredOrderdSubsetOfBlocks, getSubsetOfBlocksSnapshot } from './utils'

export const logger = debug('tellery:editor')

const _StoryEditor: React.FC<{
  storyId: string
  bottom?: ReactNode
  fullWidth?: boolean
  showTitle?: boolean
  className?: string
  paddingHorizon?: number
  top?: ReactNode
  defaultOverflowY?: 'auto' | 'visible' | 'hidden'
}> = (props) => {
  const { storyId, defaultOverflowY = 'auto' } = props
  const editorRef = useRef<HTMLDivElement | null>(null)
  const editorTextAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const [hoverBlockId, setHoverBlockId] = useBlockHoveringState()
  const tellerySelectionRef = useRef<TellerySelection | null>(null)
  const [selectionState, setSelectionState] = useStorySelection(storyId)
  const [scrollLocked, setScrollLocked] = useState(false)
  const scrollbarWidth = useScrollbarWidth()
  const isSelectingRef = useRef<DOMRect | null>(null)
  const mouseDownEventRef = useRef<MouseEvent | null>(null)
  const lastInputCharRef = useRef<string | null>(null)
  useFetchStoryChunk(storyId)
  const rootBlock = useBlockSuspense<Story | Thought>(storyId)
  const blocksMap = useStoryBlocksMap(storyId)
  const blocksMapsRef = useRef<Record<string, Editor.BaseBlock> | null>(null)
  const [inited, setInited] = useState(false)
  const permissions = useStoryPermissions(storyId)
  const canWrite = permissions.canWrite
  const blockAdminValue = useBlockAdminProvider(storyId)
  const snapshot = useBlockSnapshot()
  const location = useLocation()
  const workspace = useWorkspace()
  const getBlock = useGetBlock()

  const getBlockLocalPreferences = useGetBlockLocalPreferences()
  useEffect(() => {
    if (blocksMap) {
      blocksMapsRef.current = blocksMap
      setInited(true)
    }
  }, [blocksMap])

  const lockOrUnlockScroll = useCallback((lock: boolean) => {
    setScrollLocked(lock)
    const editorElement = editorRef.current
    invariant(editorElement, 'editor is nullable')
  }, [])

  const focusingBlockId = useMemo(() => {
    if (selectionState?.type === TellerySelectionType.Inline) {
      return selectionState.anchor.blockId
    } else {
      return null
    }
  }, [selectionState])

  useMouseMoveInEmitter(storyId, focusingBlockId ?? hoverBlockId)

  useEffect(() => {
    tellerySelectionRef.current = selectionState
  }, [selectionState])

  const getSelection = useCallback(() => {
    return tellerySelectionRef.current
  }, [])

  const { selectionRef, triggerSelection } = useSelectionArea(
    useCallback(
      (blockIds) =>
        // blocksMapsRef may not been updated, wait for it
        setTimeout(() => {
          if (blockIds) {
            const currentBlocksMap = blocksMapsRef.current
            const orderedBlockIds = currentBlocksMap
              ? getFilteredOrderdSubsetOfBlocks(currentBlocksMap, storyId, (block) => blockIds.includes(block.id)).map(
                  (block) => block.id
                )
              : blockIds
            setSelectionState({
              type: TellerySelectionType.Block,
              selectedBlocks: orderedBlockIds,
              storyId: storyId
            })
          } else {
            setSelectionState((current) => {
              if (current?.type === TellerySelectionType.Block) {
                return null
              }
              return current
            })
          }
        }, 0),
      [setSelectionState, storyId]
    )
  )

  const setSelectedBlocks = useCallback(
    (blockIds: string[]) => {
      if (blockIds.length === 0) {
        setSelectionState(null)
      } else {
        Promise.all(blockIds.map((id) => blockAdminValue.getBlockInstanceById(id))).then(() => {
          selectionRef.current?.clearSelection()
          selectionRef.current?.select(blockIds.map((id) => `[data-block-id="${id}"]`))
          editorTextAreaRef.current?.focus()
        })
      }
    },
    [blockAdminValue, selectionRef, setSelectionState]
  )

  useEffect(() => {
    const focusTitle = (location.state as any)?.focusTitle
    if (focusTitle) {
      blockAdminValue.getBlockInstanceById(storyId).then(({ wrapperElement }) => {
        setTimeout(() => {
          setCaretToStart(wrapperElement.querySelector("[contenteditable='true']"))
        }, 100)
      })
    }
  }, [blockAdminValue, location, setSelectedBlocks, storyId])
  const fetchBlock = useFetchBlock()
  const questionEditor = useQuestionEditor(storyId)

  useEffect(() => {
    if (!inited) return
    const blockId = location.hash.slice(1) || (location.state as any)?.focusedBlockId
    const openMenu = !!(location.state as any)?.openMenu
    const select = !!(location.state as any)?.select

    if (!blockId) return

    fetchBlock(blockId).then((block) => {
      if (isQueryBlock(block.type)) {
        questionEditor.open({ blockId, storyId })
      }
      const scrollToBlockId = isQueryBlock(block.type) ? block.parentId : block.id
      // TODO: if block not belong to this story...
      blockAdminValue.getBlockInstanceById(scrollToBlockId).then(({ wrapperElement, blockRef }) => {
        const scrollContainer = editorRef.current?.parentElement

        invariant(scrollContainer, 'scrollContainer is falsy')

        setTimeout(() => {
          scrollIntoView(wrapperElement, {
            scrollMode: 'if-needed',
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
            boundary: scrollContainer
          })
          if (openMenu) {
            blockRef.current.openMenu()
          }
        }, 100)
        // TODO: use a highlight animation
        setSelectedBlocks([scrollToBlockId as string])
      })
    })
  }, [
    blockAdminValue,
    inited,
    setSelectedBlocks,
    location.state,
    location.hash,
    rootBlock.type,
    fetchBlock,
    questionEditor,
    storyId
  ])

  const blurEditor = useCallback(() => {
    setSelectionState(null)
  }, [setSelectionState])

  useClickAway(editorRef, blurEditor)

  const setSelectionAtBlockStart = useCallback(
    (block: Editor.BaseBlock) => {
      if (isTextBlock(block.type)) {
        setSelectionState({
          storyId,
          type: TellerySelectionType.Inline,
          anchor: {
            blockId: block.id,
            nodeIndex: 0,
            offset: 0
          },
          focus: {
            blockId: block.id,
            nodeIndex: 0,
            offset: 0
          }
        })
      }
    },
    [setSelectionState, storyId]
  )

  const commit = useCommit()
  const blockTranscations = useBlockTranscations()

  const createFirstOrLastBlockHandler = useCallback(async () => {
    if (!permissions.canWrite) return
    const newBlock = createEmptyBlock<Editor.BaseBlock>({
      type: Editor.BlockType.Text,
      storyId,
      parentId: storyId
    })
    const parentBlock = await getBlock(newBlock.parentId)
    const lastBlockId = parentBlock?.children?.[parentBlock.children?.length - 1]
    invariant(parentBlock, 'parentBLock not found')
    commit({
      transcation: insertBlockAfterTranscation({ block: newBlock, after: lastBlockId }),
      storyId
    })
    if (lastBlockId) {
      setCaretToEnd(getBlockElementContentEditbleById(lastBlockId))
    } else {
      setSelectionAtBlockStart(newBlock)
    }
  }, [commit, getBlock, permissions.canWrite, setSelectionAtBlockStart, storyId])

  const updateBlockProps = useCallback(
    (blockId: string, path: string[], args: any) => {
      if (!permissions.canWrite) return

      return blockTranscations.updateBlockProps(storyId, blockId, path, args)
    },
    [blockTranscations, permissions.canWrite, storyId]
  )

  const updateBlockTitle = useCallback(
    async (blockId: string, tokens: Editor.Token[]) => {
      const oldBlock = await getBlock(blockId)
      updateBlockProps(blockId, ['content', 'title'], tokens)
      if (dequal(oldBlock.content?.title, tokens) === false) {
        setSelectionState((oldSelection) => {
          if (oldSelection === null) return oldSelection
          if (oldSelection.type !== TellerySelectionType.Inline) return oldSelection
          if (oldSelection.anchor.blockId !== blockId) return oldSelection
          const newSelection = getTransformedSelection(oldSelection, oldBlock.content?.title ?? [], tokens ?? [])
          logger('update selection', oldSelection, newSelection)
          return newSelection
        })
      }
    },
    [getBlock, setSelectionState, updateBlockProps]
  )

  const editorClipboardManager = useEditorClipboardManager(storyId, getSelection, updateBlockTitle)

  const toggleBlockType = useCallback(
    async (id, type, removePrefixCount: number) => {
      const block = await getBlock(id)
      if (removePrefixCount) {
        const blockTitle: Editor.Token[] = block?.content?.title ?? []
        const splitedTokens = splitToken(blockTitle)
        updateBlockTitle(id, mergeTokens(splitedTokens.slice(removePrefixCount)))
      }
      updateBlockProps(id, ['type'], type)
    },
    [getBlock, updateBlockProps, updateBlockTitle]
  )

  const insertNewEmptyBlock = useCallback(
    async (
      blockOptions: Partial<Editor.Block>,
      targetBlockId: string,
      direction: 'top' | 'bottom' | 'child' = 'bottom',
      path = 'children'
    ) => {
      const newBlock = createEmptyBlock({
        ...blockOptions,
        storyId: storyId,
        parentId: storyId
      } as Partial<Editor.Block>)
      blockTranscations.insertBlocks(storyId, {
        blocksFragment: {
          children: [newBlock.id],
          data: { [newBlock.id]: newBlock }
        },
        direction: direction,
        targetBlockId: targetBlockId,
        path
      })
      return newBlock
    },
    [blockTranscations, storyId]
  )

  useEffect(() => {
    const afterAdded = async () => {
      if (selectionState?.type !== TellerySelectionType.Inline || !lastInputCharRef.current) {
        return
      }

      const currentBlock = await getBlock(selectionState.anchor.blockId)
      if (currentBlock.type === Editor.BlockType.Story || isQuestionLikeBlock(currentBlock.type)) {
        return
      }

      // logger('lastinput', lastInputChar)
      const splitedTokens = splitToken(currentBlock.content?.title ?? [])
      const transformData = getTransformedTypeAndPrefixLength(
        splitedTokens,
        1,
        selectionState,
        lastInputCharRef.current
      )
      if (!transformData) return
      // logger('transform', transformData)

      const prefixLength = transformData ? (transformData[1] as number) : 0
      const newType = transformData ? (transformData[0] as Editor.BlockType) : null

      switch (newType) {
        case Editor.BlockType.Visualization: {
          toggleBlockType(currentBlock.id, newType, prefixLength)
          blockAdminValue.getBlockInstanceById(currentBlock.id).then((instance) => {
            instance.blockRef.current.openMenu()
          })

          break
        }
        case Editor.BlockType.Divider: {
          toggleBlockType(currentBlock.id, currentBlock.type, prefixLength)
          insertNewEmptyBlock({ type: newType }, currentBlock.id, 'top')
          break
        }
        default: {
          toggleBlockType(currentBlock.id, newType, prefixLength)
        }
      }
    }
    afterAdded()
  }, [
    blockAdminValue,
    getBlock,
    insertNewEmptyBlock,
    lastInputCharRef,
    selectionState,
    setSelectionAtBlockStart,
    snapshot,
    toggleBlockType
  ])

  useEffect(() => {
    logger('selection state', selectionState)
  }, [selectionState])

  const deleteBackward = useCallback(
    async (unit: 'character', options: { selection: TellerySelection }) => {
      const operations: Operation[] = []
      const selectionState = options?.selection
      if (selectionState === null || selectionState.type === TellerySelectionType.Block) {
        return
      }

      const blockId = selectionState.anchor.blockId
      const block = await getBlock(blockId)

      // Content should be merge to prvious text block
      const mergeForward =
        !block!.content!.title || block!.content!.title.length > 1 || block.content?.title?.[0]?.[0]?.length
      const previousTextBlock = findPreviousTextBlock(blockId, snapshot)

      logger('find previous text block', previousTextBlock)

      if (mergeForward && previousTextBlock) {
        const previousContent = {
          ...previousTextBlock.content,
          title: mergeTokens([...(previousTextBlock.content?.title || []), ...(block.content?.title || [])])
        }
        operations.push(
          ...[
            {
              cmd: 'update',
              id: previousTextBlock.id,
              path: ['content'],
              args: previousContent,
              table: 'block'
            }
          ]
        )
      }

      if (previousTextBlock && block.children?.length) {
        let afterId: string | null = null
        for (const childId of block.children) {
          operations.push(
            ...[
              {
                cmd: 'listRemove',
                id: block.id,
                path: ['children'],
                args: {
                  id: childId
                },
                table: 'block'
              }
            ]
          )
          if (afterId === null) {
            operations.push(
              ...[
                {
                  cmd: 'listBefore',
                  id: previousTextBlock.id,
                  path: ['children'],
                  args: {
                    id: childId
                  },
                  table: 'block'
                }
              ]
            )
          } else {
            operations.push(
              ...[
                {
                  cmd: 'listAfter',
                  id: previousTextBlock.id,
                  path: ['children'],
                  args: {
                    id: childId,
                    after: afterId
                  },
                  table: 'block'
                }
              ]
            )
          }
          afterId = childId
        }
      }

      // Nomatter merged or not, block will be deleted
      // expect first block
      const targetBlock = getBlockFromSnapshot(blockId, snapshot)
      const rootBlock = getBlockFromSnapshot(targetBlock.storyId!, snapshot)
      if (rootBlock!.children![0] !== blockId) {
        operations.push(
          ...[
            {
              cmd: 'listRemove',
              id: targetBlock.parentId,
              path: ['children'],
              args: { id: targetBlock.id },
              table: 'block'
            },
            {
              cmd: 'update',
              id: blockId,
              path: ['alive'],
              args: false,
              table: 'block'
            }
          ]
        )
      }

      if (previousTextBlock) {
        const tokens = previousTextBlock!.content!.title || []
        const nodeIndex = tokens.length ? tokens.length - 1 : 0
        const point = {
          blockId: previousTextBlock.id,
          nodeIndex: nodeIndex,
          offset: tokens.length ? tokens[nodeIndex][0].length : 0
        }
        setSelectionState({
          type: TellerySelectionType.Inline,
          anchor: point,
          focus: point,
          storyId
        })
      }
      commit({ transcation: createTranscation({ operations: operations }), storyId })
    },
    [commit, getBlock, setSelectionState, snapshot, storyId]
  )

  const toggleBlocksIndention = useCallback(
    (blockIds: string[], type: 'in' | 'out') => {
      const blockId = blockIds[0]
      const block = getBlockFromSnapshot(blockId, snapshot)
      const parentBlock = getBlockFromSnapshot(block.parentId, snapshot)

      if (type === 'in') {
        const previousBlock = findPreviouseBlock(blockId, block.parentId, blockIds, snapshot)
        if (previousBlock && isBlockHasChildren(previousBlock)) {
          const operations = getIndentionOperations(block, previousBlock, parentBlock, blockIds)
          commit({ transcation: createTranscation({ operations }), storyId })
        }
      } else if (type === 'out' && canOutdention(parentBlock, blockIds)) {
        const operations = getOutdentionOperations(blockId, parentBlock, blockIds)
        commit({ transcation: createTranscation({ operations }), storyId })
      }
    },
    [commit, snapshot, storyId]
  )

  const user = useLoggedUser()
  const commitHistory = useCommitHistory<{ selection: TellerySelection }>(user.id, storyId)
  useHandleUrlPasted(storyId, getSelection, updateBlockTitle)
  const locked = useMemo(() => {
    return !!(rootBlock as Story)?.format?.locked || canWrite === false
  }, [canWrite, rootBlock])

  const focusBlockHandler = usePushFocusedBlockIdState()
  const { t } = useTranslation()

  const syncDuplicatedBlocks = useCallback(
    (duplicatedBlocksFragment: { children: string[]; data: Record<string, Editor.BaseBlock> }) => {
      const lastBlockId = duplicatedBlocksFragment.children[duplicatedBlocksFragment.children.length - 1]
      const currentBlock = duplicatedBlocksFragment.data[lastBlockId]
      const blockId = currentBlock.id

      focusBlockHandler(blockId, currentBlock.storyId, false)
      const originalQuestionsBlocks: Editor.VisualizationBlock[] = Object.values(duplicatedBlocksFragment.data).filter(
        (block) => isVisualizationBlock(block.type) && block.children?.length !== 0
      )

      const linkAll = () => {
        originalQuestionsBlocks.forEach((block) => {
          blockAdminValue.getBlockInstanceById(block.id).then(({ blockRef }) => {
            const visBlockRef = blockRef.current as any
            visBlockRef.restoreOriginalQueryId()
          })
        })
      }

      if (originalQuestionsBlocks.length) {
        toast(
          <div
            className={css`
              display: flex;
              align-items: center;
              width: 100%;
            `}
          >
            <div
              className={css`
                color: ${ThemingVariables.colors.text[0]};
              `}
            >
              {t('You pasted {{count}} question', { count: originalQuestionsBlocks.length })}
            </div>
            <Button
              color={ThemingVariables.colors.text[0]}
              className={css`
                margin-left: 30px;
                margin-right: 20px;
                border: solid 1px ${ThemingVariables.colors.gray[1]};
                outline: none;
                background: transparent;
                cursor: pointer;
                padding: 5px 15px;
                color: ${ThemingVariables.colors.text[0]};
                font-size: 12px;
                line-height: 14px;
              `}
              onClick={() => {
                linkAll()
              }}
            >
              Stay in sync
            </Button>
          </div>,
          { position: 'bottom-center', autoClose: 10000 }
        )
      }
    },
    [blockAdminValue, focusBlockHandler, t]
  )

  const duplicateHandler = useCallback(
    (blockIds: string[]) => {
      if (blockIds.length === 0) return

      const targetBlockId = blockIds[blockIds.length - 1]
      const targetBlock = getBlockFromSnapshot(targetBlockId, snapshot)

      const duplicatedBlocksFragment = getDuplicatedBlocksFragment(
        blockIds,
        getSubsetOfBlocksSnapshot(snapshot, blockIds),
        storyId,
        targetBlock.parentId,
        {}
      )

      blockTranscations.insertBlocks(storyId, {
        blocksFragment: duplicatedBlocksFragment,
        targetBlockId: blockIds[blockIds.length - 1],
        direction: 'bottom'
      })

      setSelectedBlocks(duplicatedBlocksFragment.children)
      syncDuplicatedBlocks(duplicatedBlocksFragment)
      // if(.some(block => isQu))
      // toast('duplicate success')

      return duplicatedBlocksFragment
    },
    [syncDuplicatedBlocks, blockTranscations, setSelectedBlocks, snapshot, storyId]
  )

  const globalKeyDownHandler = useCallback(
    (e: KeyboardEvent) => {
      if (e.defaultPrevented) return

      const selectionState = getSelection()
      if (selectionState === null || locked) {
        return
      }
      const handlers: { hotkeys: string[]; handler: (e: KeyboardEvent) => void }[] = [
        {
          hotkeys: ['backspace'],
          handler: (e) => {
            if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
              if (isSelectionAtStart(selectionState)) {
                e.preventDefault()
                deleteBackward('character', { selection: selectionState })
              }
            } else {
              if (selectionState.type === TellerySelectionType.Block) {
                e.preventDefault()
                blockTranscations.removeBlocks(storyId, selectionState.selectedBlocks)
              }
            }
          }
        },

        {
          hotkeys: ['mod+x'],
          handler: (e) => {
            editorClipboardManager.doCut(e)
          }
        },
        {
          hotkeys: ['mod+d'],
          handler: (e) => {
            e.preventDefault()
            let blockIds: string[] = []
            if (selectionState?.type === TellerySelectionType.Block) {
              blockIds = selectionState.selectedBlocks
            } else if (selectionState?.focus.blockId) {
              blockIds = [selectionState?.focus.blockId]
            }
            duplicateHandler(blockIds)
          }
        },
        {
          hotkeys: ['mod+c'],
          handler: (e) => {
            // e.preventDefault()
            editorClipboardManager.doCopy(e)
          }
        },
        {
          hotkeys: ['mod+z'],
          handler: async (e) => {
            e.preventDefault()
            const env = commitHistory.undo()
            env?.selection && setSelectionState(env.selection)
          }
        },
        {
          hotkeys: ['mod+shift+z'],
          handler: async (e) => {
            e.preventDefault()
            const env = commitHistory.redo()
            env?.selection && setSelectionState(env.selection)
          }
        }
      ]
      const matchingHandler = handlers.find((handler) =>
        handler.hotkeys.some((hotkey) => isHotkey(hotkey, { byKey: true }, e))
      )
      matchingHandler?.handler(e)
    },
    [
      blockTranscations,
      commitHistory,
      deleteBackward,
      duplicateHandler,
      editorClipboardManager,
      getSelection,
      locked,
      setSelectionState,
      storyId
    ]
  )

  const keyDownHandler = useCallback(
    (e: React.KeyboardEvent) => {
      logger('key down', e)
      const selectionState = getSelection()
      if (e.defaultPrevented) return

      if (selectionState === null || locked) {
        return
      }

      lastInputCharRef.current = e.key

      const handlers: { hotkeys: string[]; handler: (e: KeyboardEvent) => void }[] = [
        {
          hotkeys: ['enter'],
          handler: async (e) => {
            e.preventDefault()
            setHoverBlockId(null)
            if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
              const blockId = selectionState.anchor.blockId
              const block = getBlockFromSnapshot(blockId, snapshot)
              if (!block) return

              const element = getBlockElementContentEditbleById(blockId)
              invariant(element, 'element not exist')
              if (isSelectionAtStart(selectionState)) {
                const newBlock = createEmptyBlock({
                  type: Editor.BlockType.Text,
                  storyId,
                  parentId: storyId
                })
                blockTranscations.insertBlocks(storyId, {
                  blocksFragment: {
                    children: [newBlock.id],
                    data: { [newBlock.id]: newBlock }
                  },
                  targetBlockId: blockId,
                  direction: block.type === Editor.BlockType.Story ? 'child' : 'top'
                })
                if (block.type === Editor.BlockType.Story) {
                  setSelectionAtBlockStart(newBlock)
                }
              } else if (isCaretAtEnd(element)) {
                const getNextBlockType = (block: Editor.BaseBlock) => {
                  if (block.type === Editor.BlockType.BulletList) {
                    return Editor.BlockType.BulletList
                  }
                  if (block.type === Editor.BlockType.Todo) {
                    return Editor.BlockType.Todo
                  }
                  if (block.type === Editor.BlockType.NumberedList) {
                    return Editor.BlockType.NumberedList
                  }
                  return Editor.BlockType.Text
                }
                const nextBlockType = getNextBlockType(block)
                const newBlock = createEmptyBlock({
                  type: nextBlockType,
                  storyId,
                  parentId: storyId
                })
                const getDirection = async (block: Editor.BaseBlock) => {
                  if (block.type === Editor.BlockType.Story) {
                    return 'child'
                  }
                  if (block.type === Editor.BlockType.Toggle) {
                    const collapsedState = await getBlockLocalPreferences({ id: block.id, key: 'toggle' })
                    if (collapsedState) {
                      return 'bottom'
                    }
                  }
                  return block.children?.length ? 'child' : 'bottom'
                }
                const direction = await getDirection(block)
                blockTranscations.insertBlocks(storyId, {
                  blocksFragment: {
                    children: [newBlock.id],
                    data: { [newBlock.id]: newBlock }
                  },
                  targetBlockId: blockId,
                  direction: direction
                })
                setSelectionAtBlockStart(newBlock)
              } else {
                const [tokens1, tokens2] = splitBlockTokens(block.content?.title || [], selectionState)
                const newBlock = createEmptyBlock({
                  type: Editor.BlockType.Text,
                  storyId: block.storyId!,
                  parentId: block.parentId,
                  content: {
                    title: tokens2
                  }
                })
                commit({
                  storyId,
                  transcation: createTranscation({
                    operations: [
                      {
                        cmd: 'update',
                        id: block.id,
                        args: { ...block.content, title: tokens1 },
                        table: 'block',
                        path: ['content']
                      },
                      ...insertBlocksAndMoveOperations({
                        storyId,
                        blocksFragment: {
                          children: [newBlock.id],
                          data: { [newBlock.id]: newBlock }
                        },
                        targetBlock: block,
                        direction: block.type === Editor.BlockType.Story ? 'child' : 'bottom',
                        path: 'children'
                      })
                    ]
                  })
                })
                setSelectionAtBlockStart(newBlock)
              }
            }
          }
        },
        { hotkeys: ['shift+enter'], handler: (e) => {} },
        {
          hotkeys: ['arrowup'],
          handler: (e) => {
            if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
              const blockId = selectionState.anchor.blockId
              const selection = window.getSelection()
              if (!selection) {
                logger('selection is undefind, arrowup cancel')
                return
              }
              const range = selection.getRangeAt(0)
              const currentBlockElement = getBlockElementContentEditbleById(blockId)
              invariant(currentBlockElement, 'block not found')
              const selectionRect = range.getBoundingClientRect()
              const atFirstLine = isSelectionAtFirstLine(selection, currentBlockElement)
              logger(`cursor ar first line = ${atFirstLine}`)
              if (atFirstLine) {
                const previousBlockRef = getPreviousTextBlockElement(blockId, snapshot)
                if (!previousBlockRef) {
                  return
                }
                const previousBlockRect = previousBlockRef.getBoundingClientRect()
                const range = getRangeFromPoint(selectionRect.x, previousBlockRect.y + previousBlockRect.height - 6)
                if (!range) {
                  return
                }
                e.preventDefault()
                selection.removeAllRanges()
                selection.addRange(range)
                previousBlockRef.focus()
              }
            }
          }
        },
        {
          hotkeys: ['arrowdown'],
          handler: (e) => {
            if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
              const blockId = selectionState.anchor.blockId
              const selection = window.getSelection()
              if (!selection) {
                return
              }
              const range = selection.getRangeAt(0)
              const currentBlockElement = getBlockElementContentEditbleById(blockId)
              invariant(currentBlockElement, 'block not found')
              const selectionRect = range.getBoundingClientRect()
              const atLastLine = isSelectionAtLastLine(selection, currentBlockElement)
              if (atLastLine) {
                const nextBlockElement = getNextTextBlockElement(blockId, snapshot)
                if (!nextBlockElement) {
                  return
                }
                const nextBlockRect = nextBlockElement.getBoundingClientRect()
                const range = getRangeFromPoint(selectionRect.x, nextBlockRect.y + 10)
                if (!range) {
                  return
                }
                e.preventDefault()
                selection.removeAllRanges()
                selection.addRange(range)
                nextBlockElement.focus()
              }
            }
          }
        },
        {
          hotkeys: ['cmd+s'],
          handler: (e) => {
            e.preventDefault()
          }
        },
        {
          hotkeys: ['arrowleft'],
          handler: (e) => {
            if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
              const blockId = selectionState.anchor.blockId
              const selection = window.getSelection()
              if (!selection) {
                return
              }
              const currentBlockElement = getBlockElementContentEditbleById(blockId)
              invariant(currentBlockElement, 'element is null')
              if (isCaretAtStart(currentBlockElement)) {
                const previousBlockElement = getPreviousTextBlockElement(blockId, snapshot)
                e.preventDefault()
                setCaretToEnd(previousBlockElement)
              }
            }
          }
        },
        {
          hotkeys: ['arrowright'],
          handler: (e) => {
            if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
              const blockId = selectionState.anchor.blockId
              const selection = window.getSelection()
              if (!selection) {
                return
              }
              const currentBlockElement = getBlockElementContentEditbleById(blockId)
              if (isCaretAtEnd(currentBlockElement)) {
                const nextBlockElement = getNextTextBlockElement(blockId, snapshot)
                e.preventDefault()
                setCaretToStart(nextBlockElement)
              }
            }
          }
        },

        {
          hotkeys: ['tab'],
          handler: (e) => {
            const blockIds =
              selectionState.type === TellerySelectionType.Inline
                ? [selectionState.anchor.blockId]
                : selectionState.selectedBlocks
            e.preventDefault()
            e.stopPropagation()
            toggleBlocksIndention(blockIds, 'in')
          }
        },
        {
          hotkeys: ['shift+tab'],
          handler: (e) => {
            const blockIds =
              selectionState.type === TellerySelectionType.Inline
                ? [selectionState.anchor.blockId]
                : selectionState.selectedBlocks
            e.preventDefault()
            e.stopPropagation()
            toggleBlocksIndention(blockIds, 'out')
          }
        }
      ]
      const matchingHandler = handlers.find((handler) =>
        handler.hotkeys.some((hotkey) => isHotkey(hotkey, { byKey: true }, e.nativeEvent))
      )
      matchingHandler?.handler(e.nativeEvent)
    },
    [
      getSelection,
      locked,
      setHoverBlockId,
      snapshot,
      storyId,
      blockTranscations,
      setSelectionAtBlockStart,
      getBlockLocalPreferences,
      commit,
      toggleBlocksIndention
    ]
  )

  const cutHandler = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      editorClipboardManager.doCut(e)
    },
    [editorClipboardManager]
  )

  const copyHandler = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      editorClipboardManager.doCopy(e)
      logger('copy')
    },
    [editorClipboardManager]
  )

  const onMouseUp = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (e.defaultPrevented) return
    mouseDownEventRef.current = null
    isSelectingRef.current = null
  }, [])

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (e.defaultPrevented) return
      const rootBlock = findRootBlock(e.target as HTMLElement)
      const id = rootBlock?.dataset.blockId
      if (isSelectingRef.current) return
      if (e.nativeEvent.button === 0) {
        mouseDownEventRef.current = e.nativeEvent
      }
      if (id && rootBlock) {
        isSelectingRef.current = rootBlock.getBoundingClientRect()
      }
      setSelectedBlocks([])
    },
    [setSelectedBlocks]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!editorRef.current) return
      const contentRect = editorRef.current.getBoundingClientRect()
      const x = e.clientX < contentRect.x + 100 ? contentRect.x + 101 : e.clientX
      const container = getEndContainerFromPoint(x, e.clientY)
      if (!container) {
        setHoverBlockId(null)
      } else {
        const rootBlock = findRootBlock(container)
        const id = rootBlock?.dataset?.blockId
        const THERESHOLD = 20
        if (isSelectingRef.current && mouseDownEventRef.current) {
          if (
            e.clientX < isSelectingRef.current.left - THERESHOLD ||
            e.clientX > isSelectingRef.current.right + THERESHOLD ||
            e.clientY < isSelectingRef.current.top - THERESHOLD ||
            e.clientY > isSelectingRef.current.bottom + THERESHOLD
          ) {
            window.getSelection()?.removeAllRanges()
            triggerSelection(mouseDownEventRef.current)
            mouseDownEventRef.current = null
          }
        }

        // if (id) {
        //   debugger
        // }
        setHoverBlockId(id ?? null)
      }
    },
    [setHoverBlockId, triggerSelection]
  )

  const setUploadResource = useSetUploadResource()

  const pasteHandler = useCallback(
    (e: React.ClipboardEvent<HTMLElement>) => {
      if (locked) return
      const selectionState = getSelection()
      if (e.defaultPrevented || !selectionState) {
        return
      }
      if (e.clipboardData.files.length) {
        e.stopPropagation()
        e.preventDefault()
        invariant(selectionState?.type === TellerySelectionType.Inline, 'selection state is not inline')
        const files = e.clipboardData.files
        const fileBlocks: Editor.BaseBlock[] = Array.from(files).map(() =>
          createEmptyBlock({
            type: Editor.BlockType.File,
            storyId,
            parentId: storyId
          })
        )
        blockTranscations.insertBlocks(storyId, {
          blocksFragment: {
            children: fileBlocks.map((block) => block.id),
            data: fileBlocks.reduce((a, c) => {
              a[c.id] = c
              return a
            }, {} as Record<string, Editor.BaseBlock>)
          },
          targetBlockId: selectionState.anchor.blockId,
          direction: 'bottom'
        })
        fileBlocks.forEach((block, i) => {
          const file = files[i]
          setUploadResource({ blockId: block.id, file })
        })
      } else if (e.clipboardData) {
        const telleryBlockDataStr = e.clipboardData.getData(TELLERY_MIME_TYPES.BLOCKS)
        const telleryTokenDataStr = e.clipboardData.getData(TELLERY_MIME_TYPES.TOKEN)
        const pureText = e.clipboardData.getData('text/plain')
        if (telleryBlockDataStr) {
          if (!selectionState) return
          e.preventDefault()
          const targetBlockId =
            selectionState.type === TellerySelectionType.Inline
              ? selectionState.anchor.blockId
              : selectionState.selectedBlocks[selectionState.selectedBlocks.length - 1]
          const telleryBlocksData: {
            children: string[]
            data: Record<string, Editor.BaseBlock>
            workspaceId?: string
          } = JSON.parse(telleryBlockDataStr)

          const targetBlock = getBlockFromSnapshot(targetBlockId, snapshot)
          const duplicatedBlocksFragment = getDuplicatedBlocksFragment(
            telleryBlocksData.children,
            telleryBlocksData.data,
            storyId,
            targetBlock.id,
            {}
          )

          blockTranscations.insertBlocks(storyId, {
            blocksFragment: duplicatedBlocksFragment,
            targetBlockId: targetBlockId,
            direction: 'bottom'
          })

          setSelectedBlocks(duplicatedBlocksFragment.children)

          telleryBlocksData.workspaceId === workspace.id && syncDuplicatedBlocks(duplicatedBlocksFragment)
        } else if (telleryTokenDataStr) {
          if (!selectionState) return
          if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
            e.preventDefault()
            const targetBlockId = selectionState.anchor.blockId
            const telleryTokensData: {
              data: Editor.Token[]
              workspaceId?: string
            } = JSON.parse(telleryTokenDataStr)

            const targetBlock = getBlockFromSnapshot(targetBlockId, snapshot)
            const [tokens1, tokens2] = splitBlockTokens(targetBlock!.content!.title || [], selectionState)
            const beforeToken = mergeTokens([...tokens1, ...(telleryTokensData.data || [])])
            const afterToken = tokens2
            updateBlockTitle(targetBlockId, mergeTokens([...beforeToken, ...afterToken]))
          }
        } else if (pureText) {
          const paragraphs = pureText.split(/\s?\r?\n/g)
          const [firstPargraph, ...restParagraphs] = paragraphs
          if (selectionState) {
            if (isSelectionCrossBlock(selectionState)) {
              logger('cross block paste')
            } else if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
              logger('collesped')
              e.preventDefault()
              const content = firstPargraph ?? ''
              const currentBlock = getBlockFromSnapshot(selectionState.anchor.blockId, snapshot)
              const [tokens1, tokens2] = splitBlockTokens(currentBlock!.content!.title || [], selectionState)

              if (isUrl(content)) {
                const beforeToken = mergeTokens([...tokens1, [content, [[Editor.InlineType.Link, content]]]])
                const afterToken = tokens2
                updateBlockTitle(currentBlock.id, mergeTokens([...beforeToken, ...afterToken]))
                notifyUrlPasted(content)
              } else {
                const beforeToken = mergeTokens([...tokens1, [content]])
                const afterToken = tokens2
                updateBlockTitle(currentBlock.id, mergeTokens([...beforeToken, ...afterToken]))
              }
            } else if (selectionState.type === TellerySelectionType.Inline) {
              const content = firstPargraph ?? ''
              logger('is url', isUrl(content))
              if (isUrl(content)) {
                e.preventDefault()
                const currentBlock = getBlockFromSnapshot(selectionState.anchor.blockId, snapshot)
                updateBlockTitle(
                  currentBlock.id,
                  applyTransformOnTokensFromSelectionState(
                    currentBlock!.content!.title || [],
                    selectionState,
                    (token) => {
                      return [token[0], addMark(token[1], Editor.InlineType.Link, [content])]
                    }
                  )
                )
                setSelectionState((state) => {
                  if (state?.type === TellerySelectionType.Inline) {
                    return {
                      ...state,
                      anchor: state.focus
                    }
                  }
                  return state
                })
              } else {
                logger('to do')
              }
            }

            if (!focusingBlockId) return

            if (restParagraphs.length > 1) {
              const newBlocks = restParagraphs.map((text) =>
                createEmptyBlock({
                  type: Editor.BlockType.Text,
                  storyId,
                  parentId: storyId,
                  content: { title: [[text]] }
                })
              )
              blockTranscations.insertBlocks(storyId, {
                blocksFragment: {
                  children: newBlocks.map((block) => block.id),
                  data: newBlocks.reduce((a, c) => {
                    a[c.id] = c
                    return a
                  }, {} as Record<string, Editor.BaseBlock>)
                },
                targetBlockId: focusingBlockId,
                direction: 'bottom'
              })
            }
          }
        } else {
          e.stopPropagation()
          e.preventDefault()
        }
      }
    },
    [
      locked,
      getSelection,
      blockTranscations,
      storyId,
      updateBlockTitle,
      setUploadResource,
      snapshot,
      workspace,
      setSelectedBlocks,
      focusingBlockId,
      setSelectionState,
      syncDuplicatedBlocks
    ]
  )

  useEvent('paste', pasteHandler)
  useEvent('keydown', globalKeyDownHandler)

  const editorContext = useMemo(() => {
    return {
      updateBlockTitle,
      updateBlockProps,
      blurEditor,
      deleteBackward,
      setSelectionState,
      getSelection,
      toggleBlockType,
      removeBlocks: (blockIds: string[]) => blockTranscations.removeBlocks(storyId, blockIds),
      insertNewEmptyBlock,
      storyId,
      lockOrUnlockScroll,
      selectBlocks: setSelectedBlocks,
      duplicateHandler
    } as EditorContextInterface<Editor.BaseBlock>
  }, [
    blurEditor,
    updateBlockTitle,
    deleteBackward,
    updateBlockProps,
    setSelectionState,
    insertNewEmptyBlock,
    blockTranscations,
    getSelection,
    lockOrUnlockScroll,
    toggleBlockType,
    storyId,
    duplicateHandler,
    setSelectedBlocks
  ])

  const setSideBarRightState = useSetSideBarRightState(storyId)

  // stay
  const editorClickHandler = useCallback<React.MouseEventHandler<HTMLDivElement>>(
    (e) => {
      // e.preventDefault()
      if (e.defaultPrevented) {
        return
      }
      setSideBarRightState(null)
      const selectionState = getSelection()
      const contentRect = editorRef.current!.getBoundingClientRect()
      const x = e.clientX < contentRect.x + 100 ? contentRect.x + 101 : e.clientX
      const container = getEndContainerFromPoint(x, e.clientY)
      if (!container) return
      if (selectionState?.type === TellerySelectionType.Block) return
      const rootBlock = findRootBlock(container) as HTMLElement
      if (rootBlock && rootBlock.querySelector("[contenteditable='true']")) {
        const id = rootBlock?.dataset.blockId
        if (!id) {
          return
        }
        const element = getBlockElementContentEditbleById(id)
        if (element?.contains(e.target as Node) === false) {
          let range
          if (e.clientX < window.innerWidth / 2) {
            range = getElementStartPoint(element)
          } else {
            range = getElementEndPoint(element)
          }
          logger('focus')
          element.focus()
          restoreRange(range)
        }
      }
    },
    [getSelection, setSideBarRightState]
  )

  const [dimensions] = useDebouncedDimension(editorRef, 0, true)

  return (
    <>
      <BlockAdminContext.Provider value={blockAdminValue}>
        <StoryBlockOperatorsProvider storyId={storyId}>
          <EditorContext.Provider value={editorContext}>
            {props.top}
            <div
              style={{
                overflowY: scrollLocked ? 'hidden' : defaultOverflowY,
                paddingRight: scrollLocked ? `${scrollbarWidth}px` : '0'
              }}
              className={cx(
                'editor',
                css`
                  width: 100%;
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  user-select: none;
                  cursor: text;
                `
              )}
              onMouseMove={onMouseMove}
              onMouseDown={onMouseDown}
              onMouseUp={onMouseUp}
              onClick={editorClickHandler}
              // onPaste={pasteHandler}
              // onKeyDown={keyDownHandler}
              onCut={cutHandler}
              onCopy={copyHandler}
            >
              <motion.div
                onKeyDown={keyDownHandler}
                tabIndex={1}
                className={cx(
                  css`
                    max-width: 100%;
                    width: 900px;
                    margin: 0 auto;
                    display: flex;
                    flex: 1;
                    outline: none;
                    flex-direction: column;
                    align-items: center;
                    font-size: 16px;
                    transition: width 250ms ease;
                    padding: 0;
                    *::selection {
                      background-color: ${ThemingVariables.colors.selection[0]};
                    }
                    flex: 1;
                    user-select: none;
                  `,
                  ((rootBlock as Story).format?.fullWidth || props.fullWidth) &&
                    css`
                      width: 100%;
                    `,
                  props.className
                )}
                ref={editorRef}
              >
                <textarea
                  // onPaste={pasteHandler}
                  ref={editorTextAreaRef}
                  className={css`
                    position: fixed;
                    left: 0;
                    top: 0;
                    pointer-events: none;
                    opacity: 0;
                  `}
                />
                {props.showTitle !== false && (
                  <div
                    className={css`
                      width: 100%;
                    `}
                  >
                    {rootBlock.type === Editor.BlockType.Thought && (
                      <ThoughtItemHeader
                        id={rootBlock.id}
                        date={rootBlock.content.date}
                        className={css`
                          margin-top: 20px;
                          padding: 0;
                          margin-left: -30px;
                        `}
                      />
                    )}
                    {(rootBlock as Editor.BaseBlock).type === Editor.BlockType.Story && (
                      <ContentBlocks blockIds={[storyId]} parentType={rootBlock.type} readonly={locked}></ContentBlocks>
                    )}
                  </div>
                )}

                {dimensions && (
                  <motion.div
                    data-block-id={rootBlock.id}
                    style={
                      {
                        '--max-width': `${dimensions.width}px` ?? '100%'
                      } as CSSProperties
                    }
                    className={cx(
                      css`
                        width: 100%;
                        display: flex;
                        outline: none;
                        flex-direction: column;
                        align-items: center;
                        padding: 0;
                        width: 100%;
                        flex: 1;
                        user-select: none;
                      `,
                      (rootBlock as Story)?.format?.showBorder &&
                        css`
                          --border: dashed 1px ${ThemingVariables.colors.text[2]};
                        `,
                      'editor-content',
                      'tellery-block'
                    )}
                  >
                    {dimensions && dimensions.width !== 0 && (
                      <>
                        {rootBlock.children?.length === 0 && (
                          <EditorEmptyStatePlaceHolder onClick={createFirstOrLastBlockHandler} />
                        )}
                        {rootBlock.children && (
                          <ContentBlocks blockIds={rootBlock.children} parentType={rootBlock.type} readonly={locked} />
                        )}
                        <EditorEmptyStateEndPlaceHolder onClick={createFirstOrLastBlockHandler} height={272} />
                        {!locked && <BlockTextOperationMenu storyId={storyId} />}
                        {!locked && <TransformPastedMenu storyId={storyId} />}

                        {props.bottom && (
                          <div
                            className={css`
                              width: 100%;
                            `}
                          >
                            {props.bottom}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </div>
          </EditorContext.Provider>
        </StoryBlockOperatorsProvider>
      </BlockAdminContext.Provider>
    </>
  )
}

const EditorEmptyStatePlaceHolder = ({
  onClick
}: {
  onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
}) => {
  return (
    <div
      className={css`
        color: ${ThemingVariables.colors.gray[0]};
        align-self: flex-start;
        width: 100%;
      `}
      onClick={(e) => {
        e.preventDefault()
        onClick(e)
      }}
      onMouseDown={(e) => {
        e.preventDefault()
      }}
    >
      Click here or press Enter to continue with an empty story.
    </div>
  )
}

const EditorEmptyStateEndPlaceHolder = ({
  onClick,
  height
}: {
  onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  height: number
}) => {
  return (
    <div
      style={{ minHeight: `${height}px` }}
      className={css`
        flex: 1;
        width: 100%;
        cursor: text;
      `}
      onClick={(e) => {
        e.preventDefault()
        onClick(e)
      }}
    ></div>
  )
}

export const StoryEditor = memo(_StoryEditor)
