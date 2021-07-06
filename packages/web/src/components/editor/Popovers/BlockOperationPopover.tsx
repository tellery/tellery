import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { useCreateEmptyBlock } from '@app/helpers/blockFactory'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx } from '@emotion/css'
import {
  IconCommonLink,
  IconMenuCenterAlign,
  IconMenuDelete,
  IconMenuDuplicate,
  IconMenuInsertAfter,
  IconMenuInsertBefore
} from 'assets/icons'
import { getBlockWrapElementById } from 'components/editor/helpers/contentEditable'
import FormSwitch from 'components/kit/FormSwitch'
import Icon from 'components/kit/Icon'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import { useBlockSuspense, useUser } from 'hooks/api'
import invariant from 'invariant'
import { useAtom } from 'jotai'
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { editorTransformBlockPopoverState } from 'store'
import { getBlockFromSnapshot, useBlockSnapshot } from 'store/block'
import { ThemingVariables } from 'styles'
import { Editor, TellerySelectionType } from 'types'
import { getDuplicatedBlocks } from '../../../context/editorTranscations'
import { MenuItem } from '../../MenuItem'
import { EditorPopover } from '../EditorPopover'
import { useEditor } from '../hooks'

export interface OperationInterface {
  title: string
  icon: ReactNode
  action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  side?: ReactNode
}

export const BlockOperationPopover = (props: { id: string; children?: ReactNode }) => {
  const { id } = props

  const [open, setOpen] = useAtom(editorTransformBlockPopoverState(id))
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null)
  const editor = useEditor<Editor.Block>()

  const close = useCallback(() => {
    setReferenceElement(null)
    setOpen(false)
  }, [setOpen])

  useEffect(() => {
    if (open && props.id) {
      const blockElement = getBlockWrapElementById(props.id ?? null)
      blockElement && setReferenceElement(blockElement)
    } else {
      close()
    }
  }, [props.id, setOpen, open, editor, close])

  return (
    <EditorPopover
      open={open && !!id}
      setOpen={setOpen}
      disableClickThrough
      referenceElement={referenceElement}
      placement="left-start"
    >
      <div
        className={cx(
          css`
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 8px;
            padding: 8px;
            width: 260px;
            overflow: hidden;
          `
        )}
      >
        {open && id && <BlockPopoverInner id={id} close={close} />}
      </div>
    </EditorPopover>
  )
}

export const BlockPopoverInner: React.FC<{ id: string; close: () => void }> = ({ id, close }) => {
  const block = useBlockSuspense(id)
  const { data: user } = useUser(block?.lastEditedById ?? null)
  const editor = useEditor<Editor.Block>()
  const snapshot = useBlockSnapshot()
  const blockTranscations = useBlockTranscations()
  const createEmptyBlock = useCreateEmptyBlock()

  const addBlockHandler = useCallback(
    async (type: Editor.BlockType, duplicate: boolean) => {
      editor?.setSelectionState(null)
      const currentBlock = getBlockFromSnapshot(id, snapshot)
      if (duplicate) {
        const [block] = getDuplicatedBlocks([getBlockFromSnapshot(currentBlock.id, snapshot)], currentBlock.storyId!)
        blockTranscations.insertBlocks(block.storyId!, {
          blocks: [block],
          targetBlockId: currentBlock.id,
          direction: 'bottom'
        })
        editor?.execOnNextFlush(() => {
          editor?.getBlockInstanceById(block.id)?.afterDuplicate?.()
        })
      } else {
        const newBlock = createEmptyBlock({
          type,
          storyId: currentBlock.storyId!,
          parentId: currentBlock.storyId!
        })
        blockTranscations.insertBlocks(block.storyId!, {
          blocks: [newBlock],
          targetBlockId: currentBlock.id,
          direction: 'bottom'
        })
      }
    },
    [block.storyId, blockTranscations, createEmptyBlock, editor, id, snapshot]
  )

  const deleteBlockHandler = useCallback(() => {
    blockTranscations.removeBlocks(block.storyId!, [id])
  }, [block.storyId, blockTranscations, id])

  const operationGroups = useMemo(() => {
    return [
      [
        {
          title: 'Copy block ref',
          icon: <Icon icon={IconCommonLink} color={ThemingVariables.colors.text[0]} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            copy('placeholder', {
              onCopy: (clipboardData) => {
                invariant(block, 'block is null')
                const dataTranser = clipboardData as DataTransfer
                dataTranser.setData(
                  TELLERY_MIME_TYPES.BLOCK_REF,
                  JSON.stringify({ blockId: block.id, storyId: block.storyId })
                )
                dataTranser.setData(
                  'text/plain',
                  `${window.location.protocol}//${window.location.host}/story/${block?.storyId}#${block?.id}`
                )
              }
            })
            toast('Link Copied')
            close()
          }
        },
        {
          title: 'Duplicate',
          icon: <Icon icon={IconMenuDuplicate} color={ThemingVariables.colors.text[0]} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            addBlockHandler(Editor.BlockType.Text, true)
            close()
          }
        }
      ],
      [
        {
          title: 'Add block above',
          icon: <Icon icon={IconMenuInsertBefore} color={ThemingVariables.colors.text[0]} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            close()
            invariant(editor, 'editor context is null')
            const newBlock = editor?.insertNewEmptyBlock(Editor.BlockType.Text, id, 'top')
            invariant(newBlock, 'block not created')
            editor?.setSelectionState({
              type: TellerySelectionType.Inline,
              anchor: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
              focus: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
              storyId: newBlock.storyId!
            })
            editor?.execOnNextFlush(() => {
              console.log(editor?.getBlockInstanceById(newBlock.id))
              editor?.getBlockInstanceById(newBlock.id)?.openMenu()
            })
            // editor?.setFocusingBlockId(newBlock.id)
          }
        },
        {
          title: 'Add block below',
          icon: <Icon icon={IconMenuInsertAfter} color={ThemingVariables.colors.text[0]} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            close()

            invariant(editor, 'editor context is null')

            const newBlock = editor?.insertNewEmptyBlock(Editor.BlockType.Text, id, 'bottom')
            invariant(newBlock, 'block not created')
            editor?.setSelectionState({
              type: TellerySelectionType.Inline,
              anchor: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
              focus: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
              storyId: newBlock.storyId!
            })
            editor?.execOnNextFlush(() => {
              editor?.getBlockInstanceById(newBlock.id)?.openMenu()
            })
          }
        },
        {
          title: 'Center Align',
          icon: <Icon icon={IconMenuCenterAlign} color={ThemingVariables.colors.text[0]} />,
          side: <FormSwitch checked={block?.format?.textAlign === 'center'} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            editor?.setBlockValue(id, (block) => {
              if (block.format?.textAlign === 'center') {
                delete block.format?.textAlign
              } else {
                block.format = { ...block.format, textAlign: 'center' }
              }
            })
          }
        }
      ],
      [
        {
          title: 'Delete',
          icon: <Icon icon={IconMenuDelete} color={ThemingVariables.colors.text[0]} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            close()

            // TODO: a workaround to transition
            setTimeout(() => {
              deleteBlockHandler()
            }, 100)
          }
        }
      ]
      // {
      //   title: 'Debug: Copy block id',
      //   icon: <Icon icon={IconMenuDuplicate} color={ThemingVariables.colors.text[0]} />,
      //   action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      //     e.preventDefault()
      //     e.stopPropagation()
      //     close()
      //     copy(block?.id ?? '')
      //     toast('Id Copied')
      //   }
      // },
      // {
      //   title: 'Debug: Copy as json',
      //   icon: <Icon icon={IconMenuDuplicate} color={ThemingVariables.colors.text[0]} />,
      //   action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      //     e.preventDefault()
      //     e.stopPropagation()
      //     close()
      //     copy(JSON.stringify(block ?? {}))
      //     toast('Id Copied')
      //   }
      // }
    ]
  }, [addBlockHandler, block, close, deleteBlockHandler, editor, id])

  return (
    <>
      {operationGroups.map((operations) => {
        return (
          <>
            {operations.map((operation) => (
              <MenuItem
                key={operation.title}
                title={operation.title}
                icon={operation.icon}
                onClick={operation.action}
                side={operation.side}
              />
            ))}
            <MenuItemDivider />
          </>
        )
      })}
      {block?.lastEditedById && (
        <>
          <div
            className={css`
              color: ${ThemingVariables.colors.text[1]};
              font-size: 12px;
              padding: 0 10px;
            `}
          >
            Last edited by {user?.name}
            <br />
            {dayjs(block.updatedAt).format('YYYY-MM-DD')}
          </div>
        </>
      )}
    </>
  )
}
