import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { Operation, useCommit, useCommitHistory } from '@app/hooks/useCommit'
import { useStoryBlocksMap } from '@app/hooks/useStoryBlock'
import { css, cx } from '@emotion/css'
import computeScrollIntoView from 'compute-scroll-into-view'
import { useBlockDndContext } from '@app/context/blockDnd'
import copy from 'copy-to-clipboard'
import debug from 'debug'
import { dequal } from 'dequal'
import { motion } from 'framer-motion'
import { useOnClickOutside } from '@app/hooks'
import { useFetchStoryChunk } from '@app/hooks/api'
import produce from 'immer'
import invariant from 'invariant'
import isHotkey from 'is-hotkey'
import React, { CSSProperties, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRecoilState } from 'recoil'
import { BlockSnapshot, getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor, Story, Thought } from '@app/types'
import { isUrl, TELLERY_MIME_TYPES } from '@app/utils'
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
import { StoryQuestionsSnapshotManagerProvider } from '../StoryQuestionsSnapshotManagerProvider'
import { OperatorsContext, useStoryOperators } from './BlockOperators'
import { ThoughtTitleBlock } from './Blocks/ThoughtTitleBlock'
import { ContentBlocks } from './ContentBlock'
import {
  createTranscation,
  findPreviousTextBlock,
  findRootBlock,
  getBlockElementContentEditbleById,
  getDuplicatedBlocks,
  getElementEndPoint,
  getElementStartPoint,
  getEndContainerFromPoint,
  getNextTextBlockElement,
  getPreviousTextBlockElement,
  getRangeFromPoint,
  getTransformedSelection,
  getTransformedTypeAndPrefixLength,
  insertBlockAfterTranscation,
  isCaretAtEnd,
  isCaretAtStart,
  isSelectionAtFirstLine,
  isSelectionAtLastLine,
  isTextBlock,
  restoreRange,
  setBlockTranscation,
  setCaretToEnd,
  setCaretToStart,
  TellerySelection,
  TellerySelectionType
} from './helpers'
import { EditorContext, EditorContextInterface, useMouseMoveInEmitter } from './hooks'
import { useBlockHoveringState } from './hooks/useBlockHoveringState'
import { useDebouncedDimension } from './hooks/useDebouncedDimensions'
import { useBlockAdminProvider, BlockAdminContext } from './hooks/useBlockAdminProvider'
import { useSetUploadResource } from './hooks/useUploadResource'
import { BlockTextOperationMenu } from './Popovers/BlockTextOperationMenu'
import { TelleryStorySelection } from './store/selection'
import type { SetBlock } from './types'
import scrollIntoView from 'scroll-into-view-if-needed'
import { ThoughtItemHeader } from '../ThoughtItem'

const logger = debug('tellery:editor')

const _StoryEditor: React.FC<{
  storyId: string
  bottom?: ReactNode
  fullWidth?: boolean
  showTitle?: boolean
  className?: string
  paddingHorizon?: number
  scrollToBlockId?: string | null
  top?: ReactNode
  defaultOverflowY?: 'auto' | 'visible' | 'hidden'
}> = (props) => {
  const { storyId, defaultOverflowY = 'auto' } = props
  const editorRef = useRef<HTMLDivElement | null>(null)
  const editorTextAreaRef = useRef<HTMLTextAreaElement | null>(null)
  const [hoverBlockId, setHoverBlockId] = useBlockHoveringState()
  const tellerySelectionRef = useRef<TellerySelection | null>(null)
  const [selectionState, setSelectionState] = useRecoilState<TellerySelection | null>(TelleryStorySelection(storyId))
  const [scrollLocked, setScrollLocked] = useState(false)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const isSelectingRef = useRef<DOMRect | null>(null)
  const mouseDownEventRef = useRef<MouseEvent | null>(null)
  const blockDnd = useBlockDndContext()
  const [lastInputChar, setLastInputChar] = useState<string | null>(null)

  // const getBlockElementById = useGetBlockElementById(storyId)

  const blockAdminValue = useBlockAdminProvider()

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
  const storyOperators = useStoryOperators(storyId)

  useEffect(() => {
    tellerySelectionRef.current = selectionState
  }, [selectionState])

  const getSelection = useCallback(() => {
    return tellerySelectionRef.current
  }, [])

  const snapshot = useBlockSnapshot()

  // useWaitForBlockAndScrollTo(props.scrollToBlockId, editorRef)

  useEffect(() => {
    if (!props.scrollToBlockId) return
    blockAdminValue.getBlockInstanceById(props.scrollToBlockId).then((res) => {
      setTimeout(() => {
        scrollIntoView(res.wrapperElement, {
          scrollMode: 'always',
          block: 'center',
          behavior: 'smooth',
          inline: 'nearest',
          boundary: editorRef.current
        })
      }, 750)

      setTimeout(() => {
        res.setHighlighted(true)
      }, 1250)
    })
  }, [blockAdminValue, props.scrollToBlockId])

  const setSelectedBlocks = useCallback(
    (blockIds: string[]) => {
      if (blockIds.length === 0) {
        setSelectionState(null)
      } else {
        setSelectionState({
          type: TellerySelectionType.Block,
          selectedBlocks: blockIds,
          storyId: storyId
        })
        // trap focus state
        editorTextAreaRef.current?.focus()
      }
    },
    [setSelectionState, storyId]
  )

  const selectBlocks = useCallback(
    (blockIds: string[]) => {
      // blockIds.length && blockDnd?.selectBlockIds(blockIds)
      setSelectedBlocks(blockIds)
      if (blockIds.length) {
        editorTextAreaRef.current?.focus()
      }
    },
    [setSelectedBlocks]
  )

  const updateSelectedBlocks = useCallback(() => {
    if (!blockDnd?.selectedBlockIds) {
      setSelectedBlocks([])
      return
    }
    const ownedBlockIds = blockDnd.selectedBlockIds.filter((id) => {
      return getBlockFromSnapshot(id, snapshot).storyId === storyId
    })
    setSelectedBlocks(ownedBlockIds)
  }, [blockDnd.selectedBlockIds, setSelectedBlocks, snapshot, storyId])

  useEffect(() => {
    updateSelectedBlocks()
  }, [updateSelectedBlocks])

  const blurEditor = useCallback(() => {
    setSelectionState(null)
  }, [setSelectionState])

  useOnClickOutside(editorRef, blurEditor)

  const setSelectionAtBlockStart = useCallback(
    (block: Editor.Block) => {
      if (isTextBlock(block)) {
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
    const newBlock = createEmptyBlock<Editor.Block>({
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
  }, [commit, setSelectionAtBlockStart, snapshot, storyId])

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
    [commit, storyId, updateSelection]
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
        if (type === Editor.BlockType.Question) {
          const newBlock = createEmptyBlock({ type: Editor.BlockType.Question })
          ;(block.content as any).sql = ''
          block.format = newBlock.format
        }
        block.type = type
      })
    },
    [setBlockValue]
  )

  const insertNewEmptyBlock = useCallback(
    (blockType: Editor.BlockType, targetBlockId: string, direction: 'top' | 'bottom' | 'child' = 'bottom') => {
      const newBlock = createEmptyBlock({ type: blockType, storyId: storyId, parentId: storyId })
      blockTranscations.insertBlocks(storyId, {
        blocks: [newBlock],
        direction: direction,
        targetBlockId: targetBlockId
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
    if (currentBlock.type === Editor.BlockType.Story || currentBlock.type === Editor.BlockType.Question) {
      return
    }

    logger('lastinput', lastInputChar)
    const splitedTokens = splitToken(currentBlock.content?.title ?? [])
    const transformData = getTransformedTypeAndPrefixLength(splitedTokens, 1, selectionState, lastInputChar)
    if (!transformData) return
    logger('transform', transformData)

    const prefixLength = transformData ? (transformData[1] as number) : 0
    const newType = transformData ? (transformData[0] as Editor.BlockType) : null

    switch (newType) {
      case Editor.BlockType.Question: {
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
          if (isTextBlock(block)) {
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

      const getIndentionOperations = (previousBlock: Editor.Block) => {
        const operations: Operation[] = []
        const previousId = previousBlock.id
        let parentId = ''

        operations.push({
          cmd: 'listRemove',
          table: 'block',
          id: block.parentId,
          args: { id: blockId },
          path: ['children']
        })

        if (previousBlock.children?.length) {
          operations.push({
            cmd: 'listAfter',
            table: 'block',
            id: previousId,
            args: { id: blockId, after: previousBlock.children[previousBlock.children.length - 1] },
            path: ['children']
          })
        } else {
          operations.push({
            cmd: 'listBefore',
            table: 'block',
            id: previousId,
            args: { id: blockId },
            path: ['children']
          })
        }
        parentId = previousId

        // list other blocks after first block
        let afterId = blockId
        for (const afterBlockId of blockIds.slice(1)) {
          operations.push({
            cmd: 'listRemove',
            table: 'block',
            id: parentBlock.id,
            args: { id: afterBlockId },
            path: ['children']
          })
          operations.push({
            cmd: 'listAfter',
            table: 'block',
            id: parentId,
            args: { id: afterBlockId, after: afterId },
            path: ['children']
          })
          afterId = afterBlockId
        }

        return operations
      }

      const getOutdentionOperations = () => {
        const operations: Operation[] = []
        let parentId = ''

        operations.push({
          cmd: 'listRemove',
          table: 'block',
          id: parentBlock.id,
          args: { id: blockId },
          path: ['children']
        })
        operations.push({
          cmd: 'listAfter',
          table: 'block',
          id: parentBlock.parentId,
          args: { id: blockId, after: parentBlock.id },
          path: ['children']
        })

        parentId = parentBlock.parentId

        // list other blocks after first block
        let afterId = blockId
        for (const afterBlockId of blockIds.slice(1)) {
          operations.push({
            cmd: 'listRemove',
            table: 'block',
            id: parentBlock.id,
            args: { id: afterBlockId },
            path: ['children']
          })
          operations.push({
            cmd: 'listAfter',
            table: 'block',
            id: parentId,
            args: { id: afterBlockId, after: afterId },
            path: ['children']
          })
          afterId = afterBlockId
        }

        return operations
      }

      const findPreviouseBlock = (blockId: string, parentBlockId: string) => {
        const parentBlock = getBlockFromSnapshot(parentBlockId, snapshot)
        const peerBlockIds = parentBlock.children!
        const sourceIndex = peerBlockIds.findIndex((id) => id === blockId)

        if (
          sourceIndex !== undefined &&
          sourceIndex >= 1 &&
          blockIds.every((id) => parentBlock.children?.includes(id))
        ) {
          const previousId = peerBlockIds[sourceIndex - 1]
          const previousBlock = getBlockFromSnapshot(previousId, snapshot)
          return previousBlock
        }
      }

      const canOutdention = () => {
        return (
          blockIds.every((id) => parentBlock.children?.includes(id)) &&
          (parentBlock.type === Editor.BlockType.Story || parentBlock.type === Editor.BlockType.Thought) === false
        )
      }

      if (type === 'in') {
        const previousBlock = findPreviouseBlock(blockId, block.parentId)
        if (previousBlock && isTextBlock(previousBlock)) {
          const operations = getIndentionOperations(previousBlock)
          commit({ transcation: createTranscation({ operations }), storyId })
        }
      } else if (type === 'out' && canOutdention()) {
        const operations = getOutdentionOperations()
        commit({ transcation: createTranscation({ operations }), storyId })
      }
    },
    [commit, snapshot, storyId]
  )

  const rootBlock = useFetchStoryChunk<Story | Thought>(storyId)

  const user = useLoggedUser()

  const commitHistory = useCommitHistory<{ selection: TellerySelection }>(user.id, storyId)

  const canWrite = useMemo(() => {
    if (!rootBlock) return false
    const permissions = (rootBlock as Story).permissions
    return permissions?.some((permission) => {
      return (
        permission.role === 'manager' &&
        ((permission.type === 'workspace' && permission.role === 'manager') ||
          (permission.type === 'user' && permission.id === user.id))
      )
    })
  }, [rootBlock, user])

  const locked = useMemo(() => {
    return !!(rootBlock as Story)?.format?.locked || canWrite === false
  }, [canWrite, rootBlock])

  const focusBlockHandler = useCallback(
    (blockId: string, openMenu: boolean) => {
      const focusBlock = (blockId: string, element: HTMLElement) => {
        if (openMenu) {
          blockAdminValue.getBlockInstanceById(blockId).then((instance) => {
            instance.blockRef.current.openMenu()
          })
        }
        setTimeout(() => {
          const actions = computeScrollIntoView(element, {
            scrollMode: 'if-needed',
            block: 'end',
            inline: 'nearest',
            boundary: rootBlock.type === Editor.BlockType.Story ? editorRef.current : undefined
          })
          actions.forEach(({ el, top, left }) => {
            el.scrollTop = top + 100
            el.scrollLeft = left
          })
        }, 100)
      }

      blockAdminValue.getBlockInstanceById(blockId).then((instance) => {
        focusBlock(blockId, instance.wrapperElement)
      })
    },
    [blockAdminValue, rootBlock.type]
  )

  const duplicateHandler = useCallback(
    (blockIds: string[]) => {
      if (blockIds.length === 0) return

      const blocks = blockIds.map((blockId) => getBlockFromSnapshot(blockId, snapshot))
      const duplicatedBlocks = getDuplicatedBlocks(blocks, storyId)
      blockTranscations.insertBlocks(storyId, {
        blocks: duplicatedBlocks,
        targetBlockId: blockIds[blockIds.length - 1],
        direction: 'bottom'
      })
      setSelectedBlocks(duplicatedBlocks.map((block) => block.id))
      const currentBlock = duplicatedBlocks[duplicatedBlocks.length - 1]
      const blockId = currentBlock.id
      focusBlockHandler(blockId, currentBlock.type === Editor.BlockType.Question)
      return duplicatedBlocks
    },
    [blockTranscations, focusBlockHandler, setSelectedBlocks, snapshot, storyId]
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
          handler: (e) => {
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
                  blocks: [newBlock],
                  targetBlockId: blockId,
                  direction: 'top'
                })
              } else if (isCaretAtEnd(element)) {
                const getNextBlockType = (block: Editor.Block) => {
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
                blockTranscations.insertBlocks(storyId, {
                  blocks: [newBlock],
                  targetBlockId: blockId,
                  direction: 'bottom'
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
      commitHistory,
      storyId,
      setSelectionAtBlockStart,
      locked,
      deleteBackward,
      doCut,
      createFirstOrLastBlockHandler,
      doCopy,
      snapshot,
      toggleBlocksIndention,
      setSelectionState,
      blockTranscations,
      duplicateHandler
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
        const id = rootBlock?.dataset.blockId
        const THERESHOLD = 20
        if (isSelectingRef.current && mouseDownEventRef.current) {
          if (
            e.clientX < isSelectingRef.current.left - THERESHOLD ||
            e.clientX > isSelectingRef.current.right + THERESHOLD ||
            e.clientY < isSelectingRef.current.top - THERESHOLD ||
            e.clientY > isSelectingRef.current.bottom + THERESHOLD
          ) {
            window.getSelection()?.removeAllRanges()
            blockDnd?.triggerSelection(mouseDownEventRef.current)
            mouseDownEventRef.current = null
          }
        }

        // if (id) {
        //   debugger
        // }
        setHoverBlockId(id ?? null)
      }
    },
    [blockDnd, setHoverBlockId]
  )

  const setUploadResource = useSetUploadResource()

  const pasteHandler = useCallback(
    (e: React.ClipboardEvent<HTMLElement>) => {
      if (locked) return
      if (e.defaultPrevented) {
        return
      }
      if (e.clipboardData.files.length) {
        e.stopPropagation()
        e.preventDefault()
        invariant(selectionState?.type === TellerySelectionType.Inline, 'selection state is not inline')
        const files = e.clipboardData.files
        const fileBlocks: Editor.Block[] = [...files].map(() =>
          createEmptyBlock({
            type: Editor.BlockType.File,
            storyId,
            parentId: storyId
          })
        )
        blockTranscations.insertBlocks(storyId, {
          blocks: fileBlocks,
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
          const telleryBlocksData: Editor.Block[] = JSON.parse(telleryBlockDataStr)
          const duplicatedBlocks = getDuplicatedBlocks(telleryBlocksData, storyId)
          blockTranscations.insertBlocks(storyId, {
            blocks: duplicatedBlocks,
            targetBlockId: targetBlockId,
            direction: 'bottom'
          })
          setSelectedBlocks(duplicatedBlocks.map((block) => block.id))
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
              } else {
                logger('to do')
              }
            }

            if (!focusingBlockId) return

            if (restParagraphs.length > 1) {
              blockTranscations.insertBlocks(storyId, {
                blocks: restParagraphs.map((text) =>
                  createEmptyBlock({
                    type: Editor.BlockType.Text,
                    storyId,
                    parentId: storyId,
                    content: { title: [[text]] }
                  })
                ),
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
      setSelectedBlocks,
      setBlockValue,
      focusingBlockId
    ]
  )

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
      selectBlocks,
      duplicateHandler,
      focusBlockHandler
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
    focusBlockHandler,
    selectBlocks
  ])

  const editorClickHandler = useCallback<React.MouseEventHandler<HTMLDivElement>>(
    (e) => {
      // e.preventDefault()
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
    [selectionState]
  )

  const [dimensions] = useDebouncedDimension(editorRef, 100, true)

  // FIX: story won't show at first render
  // TODO: pass the map to StoryQuestionsSnapshotManagerProvider
  const storyBlocksMap = useStoryBlocksMap(storyId)

  return (
    <>
      <BlockAdminContext.Provider value={blockAdminValue}>
        <OperatorsContext.Provider value={storyOperators}>
          <EditorContext.Provider value={editorContext}>
            <StoryQuestionsSnapshotManagerProvider storyId={storyId}>
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
                  `
                )}
                onMouseMove={onMouseMove}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onClick={editorClickHandler}
                onPaste={pasteHandler}
                // onKeyDown={keyDownHandler}
                onCut={cutHandler}
                onCopy={copyHandler}
              >
                <div
                  onKeyDown={keyDownHandler}
                  tabIndex={1}
                  className={cx(
                    css`
                      display: flex;
                      outline: none;
                      flex-direction: column;
                      align-items: center;
                      padding: 0;
                      *::selection {
                        background-color: ${ThemingVariables.colors.selection[0]};
                      }
                      cursor: text;
                      width: 100%;
                      flex: 1;
                      user-select: none;
                    `,
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
                    `,
                    ((rootBlock as Story).format?.fullWidth || props.fullWidth) &&
                      css`
                        width: 100%;
                      `,
                    locked && 'no-select',
                    props.className
                  )}
                  ref={editorRef}
                >
                  <textarea
                    onPaste={pasteHandler}
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
                      // onClick={(e) => e.stopPropagation()}
                    >
                      {rootBlock.type === Editor.BlockType.Thought && (
                        <ThoughtItemHeader
                          id={rootBlock.id}
                          date={rootBlock.content.date}
                          className={css`
                            margin-top: 20px;
                            padding: 0;
                          `}
                        />
                      )}
                      {(rootBlock as Editor.Block).type === Editor.BlockType.Story && (
                        <ContentBlocks
                          blockIds={[storyId]}
                          parentType={rootBlock.type}
                          readonly={locked}
                        ></ContentBlocks>
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
                          <React.Suspense fallback={<div>Loading...</div>}>
                            {rootBlock.children?.length === 0 && (
                              <EditorEmptyStatePlaceHolder onClick={createFirstOrLastBlockHandler} />
                            )}
                            {rootBlock.children && (
                              <ContentBlocks
                                blockIds={rootBlock.children}
                                parentType={rootBlock.type}
                                readonly={locked}
                              />
                            )}
                          </React.Suspense>
                          <EditorEmptyStateEndPlaceHolder
                            onClick={createFirstOrLastBlockHandler}
                            height={rootBlock.type === Editor.BlockType.Story ? 272 : 72}
                          />
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
                </div>
              </div>
            </StoryQuestionsSnapshotManagerProvider>
          </EditorContext.Provider>
        </OperatorsContext.Provider>
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
