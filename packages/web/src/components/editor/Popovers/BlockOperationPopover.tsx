import {
  IconCommonLink,
  IconMenuCenterAlign,
  IconMenuDelete,
  IconMenuDuplicate,
  IconMenuInsertAfter,
  IconMenuInsertBefore
} from '@app/assets/icons'
import { StyledDropDownItem } from '@app/components/kit/DropDownMenu'
import FormSwitch from '@app/components/kit/FormSwitch'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { useBlockSuspense, useUser } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { usePushFocusedBlockIdState } from '@app/hooks/usePushFocusedBlockIdState'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { TELLERY_MIME_TYPES } from '@app/utils'
import { css } from '@emotion/css'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import React, { memo, ReactNode, useCallback, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify'
import invariant from 'tiny-invariant'
import { TellerySelectionType } from '../helpers'
import { useEditor } from '../hooks'

export interface OperationInterface {
  title: string
  icon: ReactNode
  action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void
  side?: ReactNode
}

const _BlockOperationPopover: React.FC<{ id: string; children?: ReactNode; open: boolean; close: Function }> = (
  props
) => {
  const { id } = props
  const closeHandler = useCallback(() => {
    props.close()
  }, [props])

  return id ? <BlockPopoverInner id={id} requestClose={closeHandler} /> : null
}

export const BlockOperationPopover = memo(_BlockOperationPopover)

export const BlockPopoverInner: React.FC<{ id: string; requestClose: () => void }> = ({ id, requestClose }) => {
  const block = useBlockSuspense<Editor.ContentBlock>(id)
  const { data: user } = useUser(block?.lastEditedById ?? null)
  const editor = useEditor<Editor.ContentBlock>()
  const blockTranscations = useBlockTranscations()

  const deleteBlockHandler = useCallback(() => {
    blockTranscations.removeBlocks(block.storyId!, [id])
  }, [block.storyId, blockTranscations, id])
  const focusBlockHandler = usePushFocusedBlockIdState()

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
            requestClose()
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

            requestClose()
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
            requestClose()
            invariant(editor, 'editor context is null')
            const newBlock = editor?.insertNewEmptyBlock({ type: Editor.BlockType.Text }, id, 'top')
            invariant(newBlock, 'block not created')
            editor?.setSelectionState({
              type: TellerySelectionType.Inline,
              anchor: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
              focus: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
              storyId: newBlock.storyId!
            })
            focusBlockHandler(newBlock.id, newBlock.storyId, true)
          }
        },
        {
          title: 'Add block below',
          icon: <IconMenuInsertAfter color={ThemingVariables.colors.text[0]} />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            requestClose()

            invariant(editor, 'editor context is null')

            const newBlock = editor?.insertNewEmptyBlock({ type: Editor.BlockType.Text }, id, 'bottom')
            invariant(newBlock, 'block not created')
            editor?.setSelectionState({
              type: TellerySelectionType.Inline,
              anchor: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
              focus: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
              storyId: newBlock.storyId!
            })
            focusBlockHandler(newBlock.id, newBlock.storyId, true)
          }
        },
        {
          title: 'Center align',
          icon: <IconMenuCenterAlign color={ThemingVariables.colors.text[0]} />,
          side: <FormSwitch checked={block?.format?.textAlign === 'center'} readOnly />,
          action: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault()
            e.stopPropagation()
            editor?.updateBlockProps(id, ['format'], {
              ...block.format,
              textAlign: block.format?.textAlign === 'center' ? undefined : 'center'
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
            requestClose()

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
      //   }
      // }
    ]
  }, [block, deleteBlockHandler, editor, focusBlockHandler, id, requestClose])

  return (
    <>
      {operationGroups.map((operations, index) => {
        return (
          <React.Fragment key={index}>
            {operations.map((operation) => (
              <StyledDropDownItem
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
