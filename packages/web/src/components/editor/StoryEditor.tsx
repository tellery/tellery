import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useOnClickOutside } from '@app/hooks'
import { useFetchStoryChunk } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { Operation, useCommit, useCommitHistory } from '@app/hooks/useCommit'
import { usePushFocusedBlockIdState } from '@app/hooks/usePushFocusedBlockIdState'
import { useSelectionArea } from '@app/hooks/useSelectionArea'
import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { BlockSnapshot, getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor, Story, Thought } from '@app/types'
import { isUrl, TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx } from '@emotion/css'
import copy from 'copy-to-clipboard'
import debug from 'debug'
import { dequal } from 'dequal'
import { motion } from 'framer-motion'
import produce from 'immer'
import isHotkey from 'is-hotkey'
import React, { CSSProperties, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useEvent } from 'react-use'
import scrollIntoView from 'scroll-into-view-if-needed'
import invariant from 'tiny-invariant'
import {
  addMark,
  applyTransformOnTokensFromSelectionState,
  convertBlocksOrTokensToPureText,
  getBlocksFragmentFromSelection,
  isSelectionAtStart,
  isSelectionCollapsed,
  isSelectionCrossBlock,
  mergeTokens,
  splitBlockTokens,
  splitToken,
  tokenPosition2SplitedTokenPosition
} from '.'
import { ThoughtItemHeader } from '../ThoughtItem'
import { isBlockHasChildren, isQuestionLikeBlock, isTextBlock, isVisualizationBlock } from './Blocks/utils'
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
  isCaretAtEnd,
  isCaretAtStart,
  isSelectionAtFirstLine,
  isSelectionAtLastLine,
  restoreRange,
  setBlockTranscation,
  setCaretToEnd,
  setCaretToStart,
  TellerySelection,
  TellerySelectionType
} from './helpers'
import { EditorContext, EditorContextInterface, useMouseMoveInEmitter } from './hooks'
import { BlockAdminContext, useBlockAdminProvider } from './hooks/useBlockAdminProvider'
import { useBlockHoveringState } from './hooks/useBlockHoveringState'
import { useGetBlockLocalPreferences } from './hooks/useBlockLocalPreferences'
import { useDebouncedDimension } from './hooks/useDebouncedDimensions'
import { useStorySelection } from './hooks/useStorySelection'
import { useSetUploadResource } from './hooks/useUploadResource'
import { BlockTextOperationMenu } from './Popovers/BlockTextOperationMenu'
import { StoryBlockOperatorsProvider } from './StoryBlockOperatorsProvider'
import type { SetBlock } from './types'
import { getFilteredOrderdSubsetOfBlocks, getSubsetOfBlocksSnapshot } from './utils'
const logger = debug('tellery:editor')

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
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const isSelectingRef = useRef<DOMRect | null>(null)
  const mouseDownEventRef = useRef<MouseEvent | null>(null)
  const [lastInputChar, setLastInputChar] = useState<string | null>(null)
  const rootBlock = useFetchStoryChunk<Story | Thought>(storyId)
  const blocksMap = useStoryBlocksMap(storyId)
  const blocksMapsRef = useRef<Record<string, Editor.BaseBlock> | null>(null)
  const [inited, setInited] = useState(false)
  const permissions = useStoryPermissions(storyId)
  const canWrite = permissions.canWrite

  const getBlockLocalPreferences = useGetBlockLocalPreferences()
  useEffect(() => {
    if (blocksMap) {
      blocksMapsRef.current = blocksMap
      setInited(true)
    }
  }, [blocksMap])

  const blockAdminValue = useBlockAdminProvider(storyId)

  const lockOrUnlockScroll = useCallback((lock: boolean) => {
    setScrollLocked(lock)
    const editorElement = editorRef.current
    invariant(editorElement, 'editor is nullable')
    const spareWidth = editorElement.getBoundingClientRect().width - editorElement?.clientWidth
    setScrollbarWidth(spareWidth)
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

  const snapshot = useBlockSnapshot()

  const { selectionRef } = useSelectionArea(
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
            setSelectionState(null)
          }
        }, 0),
      [setSelectionState, storyId]
    )
  )

  const triggerSelection = useCallback(
    (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (!selectionRef.current) {
        return
      }
      selectionRef.current.trigger(event, true)
    },
    [selectionRef]
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

  const location = useLocation()

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

  useEffect(() => {
    if (!inited) return
    const blockId = location.hash.slice(1) || (location.state as any)?.focusedBlockId
    const openMenu = !!(location.state as any)?.openMenu
    const select = !!(location.state as any)?.select

    if (!blockId) return
    // TODO: if block not belong to this story...
    blockAdminValue.getBlockInstanceById(blockId).then(({ wrapperElement, blockRef }) => {
      setTimeout(() => {
        scrollIntoView(wrapperElement, {
          scrollMode: 'if-needed',
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
          boundary: editorRef.current?.parentElement
        })
        if (openMenu) {
          blockRef.current.openMenu()
        }
      }, 100)
      select && setSelectedBlocks([blockId as string])
    })
  }, [blockAdminValue, inited, setSelectedBlocks, location.state, location.hash, rootBlock.type])

  const blurEditor = useCallback(() => {
    setSelectionState(null)
  }, [setSelectionState])

  useOnClickOutside(editorRef, blurEditor)

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

  const createFirstOrLastBlockHandler = useCallback(() => {
    if (!permissions.canWrite) return
    const newBlock = createEmptyBlock<Editor.BaseBlock>({
      type: Editor.BlockType.Text,
      storyId,
      parentId: storyId
    })
    const parentBlock = getBlockFromSnapshot(newBlock.parentId, snapshot)
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
  }, [commit, permissions.canWrite, setSelectionAtBlockStart, snapshot, storyId])

  const updateSelection = useCallback(
    (newBlock: Editor.BaseBlock, oldBlock: Editor.BaseBlock) => {
      setSelectionState((oldSelection) => {
        if (oldSelection === null) return oldSelection
        if (oldSelection.type !== TellerySelectionType.Inline) return oldSelection
        if (oldSelection.anchor.blockId !== newBlock.id) return oldSelection
        const newSelection = getTransformedSelection(
          oldSelection,
          oldBlock.content?.title ?? [],
          newBlock.content?.title ?? []
        )
        return newSelection
      })
    },
    [setSelectionState]
  )

  const setBlockValue = useCallback<SetBlock<Editor.BaseBlock>>(
    (id, update) => {
      if (!permissions.canWrite) return
      commit({
        transcation: (snapshot) => {
          const oldBlock = getBlockFromSnapshot(id, snapshot)
          const newBlock = produce(oldBlock, update)

          if (dequal(oldBlock.content?.title, newBlock.content?.title) === false) {
            updateSelection(newBlock, oldBlock)
          }

          logger('commit')
          return setBlockTranscation({ oldBlock, newBlock })
        },
        storyId
      })
    },
    [commit, permissions.canWrite, storyId, updateSelection]
  )

  const toggleBlockType = useCallback(
    (id, type, removePrefixCount: number) => {
      setBlockValue?.(id, (block) => {
        if (block.type === Editor.BlockType.Story) return
        invariant(block.content?.title, 'title is undefined')
        const blockTitle: Editor.Token[] = block.content.title ?? []
        const splitedTokens = splitToken(blockTitle)
        if (removePrefixCount > 0) {
          block.content.title = mergeTokens(splitedTokens.slice(removePrefixCount))
        }
        // TODO: use middleware
        if (isVisualizationBlock(type)) {
          const newBlock = createEmptyBlock({ type: Editor.BlockType.Visualization })
          ;(block.content as any).sql = ''
          block.format = newBlock.format
        }
        block.type = type
      })
    },
    [setBlockValue]
  )

  const insertNewEmptyBlock = useCallback(
    (
      blockType: Editor.BlockType,
      targetBlockId: string,
      direction: 'top' | 'bottom' | 'child' = 'bottom',
      path = 'children'
    ) => {
      const newBlock = createEmptyBlock({ type: blockType, storyId: storyId, parentId: storyId })
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
    if (selectionState?.type !== TellerySelectionType.Inline || !lastInputChar) {
      return
    }

    const currentBlock = getBlockFromSnapshot(selectionState.anchor.blockId, snapshot)
    if (currentBlock.type === Editor.BlockType.Story || isQuestionLikeBlock(currentBlock.type)) {
      return
    }

    // logger('lastinput', lastInputChar)
    const splitedTokens = splitToken(currentBlock.content?.title ?? [])
    const transformData = getTransformedTypeAndPrefixLength(splitedTokens, 1, selectionState, lastInputChar)
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
      case Editor.BlockType.Divider:
        toggleBlockType(currentBlock.id, currentBlock.type, prefixLength)
        insertNewEmptyBlock(newType, currentBlock.id)
        break
      default:
        toggleBlockType(currentBlock.id, newType, prefixLength)
    }
  }, [blockAdminValue, insertNewEmptyBlock, lastInputChar, selectionState, snapshot, toggleBlockType])

  useEffect(() => {
    logger('selection state', selectionState)
  }, [selectionState])

  const deleteBlockFragmentFromSelection = useCallback(() => {
    if (selectionState === null) return
    if (selectionState?.type === TellerySelectionType.Inline) {
      const block = getBlockFromSnapshot(selectionState.anchor.blockId, snapshot)
      const tokens = block?.content?.title || []
      const splitedTokens = splitToken(tokens)

      const startPosition =
        selectionState.anchor.blockId === block.id && selectionState.anchor.nodeIndex !== -1
          ? tokenPosition2SplitedTokenPosition(tokens, selectionState.anchor.nodeIndex, selectionState.anchor.offset)
          : null
      const endPosition =
        selectionState.focus.blockId === block.id && selectionState.anchor.nodeIndex !== -1
          ? tokenPosition2SplitedTokenPosition(tokens, selectionState.focus.nodeIndex, selectionState.focus.offset)
          : null

      if (startPosition !== null && endPosition !== null) {
        setBlockValue(block.id, (block) => {
          if (isTextBlock(block.type)) {
            block!.content!.title = mergeTokens([
              ...splitedTokens.slice(0, startPosition),
              ...splitedTokens.slice(endPosition)
            ])
          }
        })
      }
    } else {
      blockTranscations.removeBlocks(storyId, selectionState.selectedBlocks)
    }
  }, [blockTranscations, selectionState, setBlockValue, snapshot, storyId])

  const setClipboardWithFragment = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>, snapshot: BlockSnapshot) => {
      logger('on copy set', selectionState)
      if (e.clipboardData && selectionState) {
        // const blocks = Object.values(editorState.blocksMap)
        const fragment = getBlocksFragmentFromSelection(selectionState, snapshot)
        logger('frag', fragment)
        if (!fragment) return
        e.clipboardData.setData(fragment.type, JSON.stringify(fragment.value))
        e.clipboardData.setData('text/plain', convertBlocksOrTokensToPureText(fragment, snapshot))
        logger('set success', fragment)
      }
    },
    [selectionState]
  )

  const deleteBackward = useCallback(
    (unit: 'character', options: { selection: TellerySelection }) => {
      const operations: Operation[] = []
      const selectionState = options?.selection
      if (selectionState === null || selectionState.type === TellerySelectionType.Block) {
        return
      }

      const blockId = selectionState.anchor.blockId
      const block = getBlockFromSnapshot(blockId, snapshot)

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
    [commit, setSelectionState, snapshot, storyId]
  )

  const doCut = useCallback(() => {
    const selection = window.getSelection()
    selection?.removeAllRanges()
    copy('tellery', {
      debug: true,
      onCopy: (clipboardData) => {
        setClipboardWithFragment({ clipboardData } as React.ClipboardEvent<HTMLDivElement>, snapshot)
        deleteBlockFragmentFromSelection()
      }
    })
  }, [deleteBlockFragmentFromSelection, setClipboardWithFragment, snapshot])

  const doCopy = useCallback(() => {
    // const selection = window.getSelection()
    // selection?.removeAllRanges()
    copy('tellery', {
      debug: true,
      onCopy: (clipboardData) => {
        setClipboardWithFragment({ clipboardData } as React.ClipboardEvent<HTMLDivElement>, snapshot)
      }
    })
  }, [setClipboardWithFragment, snapshot])

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

  const locked = useMemo(() => {
    return !!(rootBlock as Story)?.format?.locked || canWrite === false
  }, [canWrite, rootBlock])

  const focusBlockHandler = usePushFocusedBlockIdState()

  // const afterDuplicate = useCallback(() => {},[])

  const duplicateHandler = useCallback(
    (blockIds: string[]) => {
      if (blockIds.length === 0) return

      const targetBlockId = blockIds[blockIds.length - 1]
      const targetBlock = getBlockFromSnapshot(targetBlockId, snapshot)

      const duplicatedBlocksFragment = getDuplicatedBlocksFragment(
        blockIds,
        getSubsetOfBlocksSnapshot(snapshot, blockIds),
        storyId,
        targetBlock.parentId
      )

      blockTranscations.insertBlocks(storyId, {
        blocksFragment: duplicatedBlocksFragment,
        targetBlockId: blockIds[blockIds.length - 1],
        direction: 'bottom'
      })

      setSelectedBlocks(duplicatedBlocksFragment.children)
      const lastBlockId = duplicatedBlocksFragment.children[duplicatedBlocksFragment.children.length - 1]
      const currentBlock = duplicatedBlocksFragment.data[lastBlockId]
      const blockId = currentBlock.id
      focusBlockHandler(blockId, currentBlock.storyId, isQuestionLikeBlock(currentBlock.type))
      // toast(<div>dsfsdfsdfsfdsf</div>, {})
      // toast('duplicate success')

      return duplicatedBlocksFragment
    },
    [blockTranscations, focusBlockHandler, setSelectedBlocks, snapshot, storyId]
  )

  const globalKeyDownHandler = useCallback(
    (e: KeyboardEvent) => {
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
            e.preventDefault()
            doCut()
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
            e.preventDefault()
            doCopy()
          }
        },
        {
          hotkeys: ['mod+z'],
          handler: async (e) => {
            e.preventDefault()
            const env = await commitHistory.undo()
            env?.selection && setSelectionState(env.selection)
          }
        },
        {
          hotkeys: ['mod+shift+z'],
          handler: async (e) => {
            e.preventDefault()
            const env = await commitHistory.redo()
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
      doCopy,
      doCut,
      duplicateHandler,
      locked,
      selectionState,
      setSelectionState,
      storyId
    ]
  )

  const keyDownHandler = useCallback(
    (e: React.KeyboardEvent) => {
      logger('key down', e)
      if (selectionState === null || locked) {
        return
      }

      setLastInputChar(e.key)

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
              if (block.type === Editor.BlockType.Story) {
                if (!block.children?.length) {
                  createFirstOrLastBlockHandler()
                }
                return
              }
              const element = getBlockElementContentEditbleById(blockId)
              invariant(element, 'element not exist')
              // const targetBlockId = block.type === Editor.BlockType.Story ? undefined : blockId
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
                  direction: 'top'
                })
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
                      {
                        cmd: 'set',
                        id: newBlock.id,
                        args: newBlock,
                        table: 'block',
                        path: []
                      },
                      {
                        cmd: 'listAfter',
                        id: block.parentId,
                        args: { id: newBlock.id, after: block.id },
                        table: 'block',
                        path: ['children']
                      }
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
      commit,
      setHoverBlockId,
      selectionState,
      storyId,
      setSelectionAtBlockStart,
      locked,
      deleteBackward,
      getBlockLocalPreferences,
      createFirstOrLastBlockHandler,
      snapshot,
      toggleBlocksIndention,
      blockTranscations
    ]
  )

  const cutHandler = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
  }, [])

  const copyHandler = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    logger('copy')
  }, [])

  const onMouseUp = useCallback(() => {
    mouseDownEventRef.current = null
    isSelectingRef.current = null
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rootBlock = findRootBlock(e.target as HTMLElement)
    const id = rootBlock?.dataset.blockId
    if (isSelectingRef.current) return
    if (e.nativeEvent.button === 0) {
      mouseDownEventRef.current = e.nativeEvent
    }
    if (id && rootBlock) {
      isSelectingRef.current = rootBlock.getBoundingClientRect()
    }
  }, [])

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
      if (e.defaultPrevented || !selectionState) {
        return
      }
      if (e.clipboardData.files.length) {
        e.stopPropagation()
        e.preventDefault()
        invariant(selectionState?.type === TellerySelectionType.Inline, 'selection state is not inline')
        const files = e.clipboardData.files
        const fileBlocks: Editor.BaseBlock[] = [...files].map(() =>
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
          } = JSON.parse(telleryBlockDataStr)

          const targetBlock = getBlockFromSnapshot(targetBlockId, snapshot)
          const duplicatedBlocksFragment = getDuplicatedBlocksFragment(
            telleryBlocksData.children,
            telleryBlocksData.data,
            storyId,
            targetBlock.id
          )

          blockTranscations.insertBlocks(storyId, {
            blocksFragment: duplicatedBlocksFragment,
            targetBlockId: targetBlockId,
            direction: 'bottom'
          })

          setSelectedBlocks(duplicatedBlocksFragment.children)
        } else if (telleryTokenDataStr) {
          if (!selectionState) return
          if (isSelectionCollapsed(selectionState) && selectionState.type === TellerySelectionType.Inline) {
            e.preventDefault()
            const targetBlockId = selectionState.anchor.blockId
            const telleryTokensData: Editor.Token[] = JSON.parse(telleryTokenDataStr)
            setBlockValue(targetBlockId, (currentBlock) => {
              const [tokens1, tokens2] = splitBlockTokens(currentBlock!.content!.title || [], selectionState)
              const beforeToken = mergeTokens([...tokens1, ...(telleryTokensData || [])])
              const afterToken = tokens2
              currentBlock!.content!.title = mergeTokens([...beforeToken, ...afterToken])
            })
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
              setBlockValue(selectionState.anchor.blockId, (currentBlock) => {
                const [tokens1, tokens2] = splitBlockTokens(currentBlock!.content!.title || [], selectionState)
                const beforeToken = mergeTokens([...tokens1, [content]])
                const afterToken = tokens2
                currentBlock!.content!.title = mergeTokens([...beforeToken, ...afterToken])
              })
            } else if (selectionState.type === TellerySelectionType.Inline) {
              const content = firstPargraph ?? ''
              logger('is url', isUrl(content))
              if (isUrl(content)) {
                e.preventDefault()
                setBlockValue(selectionState.anchor.blockId, (currentBlock) => {
                  currentBlock!.content!.title = applyTransformOnTokensFromSelectionState(
                    currentBlock!.content!.title || [],
                    selectionState,
                    (token) => {
                      return [token[0], addMark(token[1], Editor.InlineType.Link, [content])]
                    }
                  )
                })
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
      selectionState,
      blockTranscations,
      storyId,
      setUploadResource,
      snapshot,
      setSelectedBlocks,
      setBlockValue,
      focusingBlockId,
      setSelectionState
    ]
  )

  useEvent('paste', pasteHandler)
  useEvent('keydown', globalKeyDownHandler)

  const editorContext = useMemo(() => {
    return {
      setBlockValue,
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
    deleteBackward,
    setBlockValue,
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

  const editorClickHandler = useCallback<React.MouseEventHandler<HTMLDivElement>>(
    (e) => {
      // e.preventDefault()
      if (e.defaultPrevented) {
        return
      }
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
    [selectionState?.type]
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
                        {!locked && <BlockTextOperationMenu currentBlockId={focusingBlockId} />}
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
        e.stopPropagation()
        onClick(e)
      }}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
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
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick(e)
      }}
    ></div>
  )
}

export const StoryEditor = memo(_StoryEditor)
