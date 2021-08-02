import {
  IconCommonLink,
  IconMenuCenterAlign,
  IconMenuDelete,
  IconMenuDuplicate,
  IconMenuInsertAfter,
  IconMenuInsertBefore
} from '@app/assets/icons'
import { getBlockWrapElementById } from '@app/components/editor/helpers/contentEditable'
import FormSwitch from '@app/components/kit/FormSwitch'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { useBlockSuspense, useUser } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { editorTransformBlockPopoverState } from '@app/store'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx } from '@emotion/css'
import type { FlipModifier } from '@popperjs/core/lib/modifiers/flip'
import type { OffsetModifier } from '@popperjs/core/lib/modifiers/offset'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import { useAtom } from 'jotai'
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import invariant from 'tiny-invariant'
import { MenuItem } from '../../MenuItem'
import { EditorPopover } from '../EditorPopover'
import { TellerySelectionType } from '../helpers'
import { useEditor } from '../hooks'

export interface OperationInterface {
  title: string
  icon: ReactNode
  action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  side?: ReactNode
}

const PopperModifiers: Partial<Partial<OffsetModifier | FlipModifier>>[] = [
  {
    name: 'offset',
    enabled: true,
    options: {
      offset: [0, 10]
    }
  },
  {
    name: 'flip',
    options: {
      fallbackPlacements: ['bottom-start', 'top-start']
    }
  }
]

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
      modifiers={PopperModifiers}
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
  const blockTranscations = useBlockTranscations()

  const deleteBlockHandler = useCallback(() => {
    blockTranscations.removeBlocks(block.storyId!, [id])
  }, [block.storyId, blockTranscations, id])

  const operationGroups = useMemo(() => {
    return [
      [
        {
          title: 'Copy link',
          icon: <IconCommonLink color={ThemingVariables.colors.text[0]} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            copy('placeholder', {
              onCopy: (clipboardData) => {
                invariant(block, 'block is null')
                const dataTranser = clipboardData as DataTransfer
                if (!block.storyId) return

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
          icon: <IconMenuDuplicate color={ThemingVariables.colors.text[0]} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            const selection = editor?.getSelection()
            editor?.duplicateHandler(selection?.type === TellerySelectionType.Block ? selection.selectedBlocks : [id])

            close()
          }
        }
      ],
      [
        {
          title: 'Add block above',
          icon: <IconMenuInsertBefore color={ThemingVariables.colors.text[0]} />,
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
            editor?.focusBlockHandler(newBlock.id, true)
          }
        },
        {
          title: 'Add block below',
          icon: <IconMenuInsertAfter color={ThemingVariables.colors.text[0]} />,
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
            editor?.focusBlockHandler(newBlock.id, true)
          }
        },
        {
          title: 'Center align',
          icon: <IconMenuCenterAlign color={ThemingVariables.colors.text[0]} />,
          side: <FormSwitch checked={block?.format?.textAlign === 'center'} readOnly />,
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
          icon: <IconMenuDelete color={ThemingVariables.colors.text[0]} />,
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
      //   icon: <IconMenuDuplicate color={ThemingVariables.colors.text[0]} />,
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
      //   icon: <IconMenuDuplicate color={ThemingVariables.colors.text[0]} />,
      //   action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      //     e.preventDefault()
      //     e.stopPropagation()
      //     close()
      //     copy(JSON.stringify(block ?? {}))
      //     toast('Id Copied')
      //   }
      // }
    ]
  }, [block, close, deleteBlockHandler, editor, id])

  return (
    <>
      {operationGroups.map((operations, index) => {
        return (
          <React.Fragment key={index}>
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
          </React.Fragment>
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
