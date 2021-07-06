import { getBlockFromSnapshot, useBlockSnapshot } from '@app/store/block'
import { css } from '@emotion/css'
import { IconMiscImageBlock, IconMiscQuestionBlock, IconMiscTextBlock } from 'assets/icons'
import { useBlockSuspense } from 'hooks/api'
import invariant from 'invariant'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemingVariables } from 'styles'
import { Editor, TellerySelection, TellerySelectionType } from 'types'
import { mergeTokens, splitToken, tokenPosition2SplitedTokenPosition } from '..'
import { BlockMenuItem } from '../BlockMenuItem'
import { EditorPopover } from '../EditorPopover'
import { tellerySelection2Native } from '../helpers/tellerySelection'
import { useEditor } from '../hooks'
import debug from 'debug'

const logger = debug('tellery:slashCommand')

interface SlachCommandDropDown {
  open: boolean
  id: string
  keyword: string
  blockRef: React.MutableRefObject<HTMLDivElement | null>
  setOpen: (show: boolean) => void
  selection: TellerySelection | null
  referenceRange?: null | Range | HTMLElement
}

export const SlashCommandDropdown: React.FC<SlachCommandDropDown> = (props) => {
  const { id, keyword, open, setOpen, selection } = props
  const [referenceRange, setReferenceRange] = useState<null | Range | HTMLElement>(null)

  useEffect(() => {
    if (open) {
      invariant(selection, 'selection is null')
      invariant(selection.type === TellerySelectionType.Inline, 'selection type is not inline')
      setReferenceRange((_referenceRange) => {
        const range = tellerySelection2Native(selection)
        invariant(range, 'range is null')
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
        setReferenceRange(null)
      }
    }
  }, [open, selection, setOpen])

  return (
    <EditorPopover open={open} setOpen={setOpen} referenceElement={referenceRange ?? null} placement="bottom-start">
      {referenceRange && open && (
        <SlashCommandDropDownInner {...props} open={!!(referenceRange && open)} referenceRange={referenceRange} />
      )}
    </EditorPopover>
  )
}

const isEmptyTitleBlock = (block: Editor.BaseBlock) => {
  if (!block.content?.title) return true
  return block.content.title.length === 0
}

export const SlashCommandDropDownInner: React.FC<SlachCommandDropDown> = (props) => {
  const { id, keyword, setOpen, blockRef, referenceRange, selection, open } = props
  const editor = useEditor<Editor.Block>()
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const currentBlock = useBlockSuspense(id)

  const removeBlockSlashCommandText = useCallback(() => {
    invariant(selection && selection.type !== TellerySelectionType.Block, 'selection type is block')

    const tokens = currentBlock?.content?.title ?? []
    const splitedTokens = splitToken(tokens)
    const start = tokenPosition2SplitedTokenPosition(tokens, selection.anchor.nodeIndex, selection.anchor.offset) - 1
    const end = tokenPosition2SplitedTokenPosition(tokens, selection.focus.nodeIndex, selection.focus.offset)

    invariant(typeof start === 'number' || typeof end === 'number', 'start or end is not number')

    if (splitedTokens.length === 0 || splitedTokens[start]?.[0] !== '/') {
      return currentBlock
    }

    splitedTokens.splice(start, end - start)
    const mergedTokens = mergeTokens(splitedTokens)

    editor?.setBlockValue?.(id, (block) => {
      logger('set block value')
      if (block.content?.title !== undefined) {
        block!.content!.title = mergedTokens
      }
    })
    return currentBlock
  }, [currentBlock, editor, id, selection])

  const operations = useMemo(() => {
    return [
      {
        title: 'Text',
        desc: 'Text Block',
        action: (block: Editor.BaseBlock) => {
          if (isEmptyTitleBlock(block)) {
            editor?.toggleBlockType(id, Editor.BlockType.Text, 0)
          } else {
            editor?.insertNewEmptyBlock(Editor.BlockType.Text, id, 'bottom')
          }
          setOpen(false)
        },
        icon: <IconMiscTextBlock />
      },
      {
        title: 'Image',
        desc: 'Image Block',
        action: (block: Editor.BaseBlock) => {
          if (isEmptyTitleBlock(block)) {
            editor?.toggleBlockType(id, Editor.BlockType.Image, 0)
          } else {
            editor?.insertNewEmptyBlock(Editor.BlockType.Image, id, 'bottom')
          }

          setOpen(false)
        },
        icon: <IconMiscImageBlock />
      },
      {
        title: 'Question',
        desc: 'Question Block',
        action: (block: Editor.BaseBlock) => {
          invariant(editor, 'editor is null')
          if (isEmptyTitleBlock(block)) {
            editor?.toggleBlockType(id, Editor.BlockType.Question, 0)
            editor?.execOnNextFlush(() => {
              editor?.getBlockInstanceById(id)?.openMenu()
            })
          } else {
            const newBlock = editor.insertNewEmptyBlock(Editor.BlockType.Question, id, 'bottom')
            editor?.execOnNextFlush(() => {
              editor?.getBlockInstanceById(newBlock.id)?.openMenu()
            })
          }
          setOpen(false)
        },
        icon: <IconMiscQuestionBlock />
      },
      {
        title: 'File Block',
        desc: 'Upload CSV/Excel/Image',
        action: (block: Editor.BaseBlock) => {
          if (isEmptyTitleBlock(block)) {
            editor?.toggleBlockType(id, Editor.BlockType.File, 0)
          } else {
            editor?.insertNewEmptyBlock(Editor.BlockType.File, id, 'bottom')
          }
          setOpen(false)
        },
        icon: <IconMiscTextBlock />
      }
    ]
  }, [editor, id, setOpen])

  const snapshot = useBlockSnapshot()
  const execSelectedOperation = useCallback(
    (index: number) => {
      removeBlockSlashCommandText()
      const block = getBlockFromSnapshot(id, snapshot)
      logger('getBlockFromSnapshot', block)
      operations[index].action(block)
    },
    [id, operations, removeBlockSlashCommandText, snapshot]
  )

  useEffect(() => {
    if (!open) return
    const blockElement = blockRef.current
    if (!blockElement) return
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown': {
          setSelectedResultIndex((index) => {
            const length = operations?.length || 0
            return index >= length ? length : index + 1
          })
          break
        }
        case 'ArrowUp': {
          setSelectedResultIndex((index) => {
            return index <= 1 ? 0 : index - 1
          })
          break
        }
        case 'Enter': {
          e.preventDefault()
          e.stopPropagation()
          execSelectedOperation(selectedResultIndex)
          break
        }
      }
    }
    blockElement.addEventListener('keydown', onKeyDown)
    return () => {
      blockElement.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedResultIndex, blockRef, operations, open, execSelectedOperation])

  return (
    <div
      className={css`
        background: ${ThemingVariables.colors.gray[5]};
        box-shadow: ${ThemingVariables.boxShadows[0]};
        border-radius: 8px;
        padding: 8px;
        width: 260px;
        overflow: hidden;
        font-weight: normal;
      `}
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      {operations.map((operation, index) => {
        return (
          <BlockMenuItem
            key={operation.title}
            title={operation.title}
            desc={operation.desc}
            icon={operation.icon}
            active={selectedResultIndex === index}
            onClick={() => execSelectedOperation(index)}
          />
        )
      })}
    </div>
  )
}
