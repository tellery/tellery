import {
  IconCommonLink,
  IconMenuCenterAlign,
  IconMenuDelete,
  IconMenuDuplicate,
  IconMenuInsertAfter,
  IconMenuInsertBefore,
  IconMenuMoveTo
} from '@app/assets/icons'
import { StyledDropDownItem, StyledDropDownTriggerItem } from '@app/components/kit/DropDownMenu'
import FormSwitch from '@app/components/kit/FormSwitch'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { SaveOrMoveToStorySubMenu } from '@app/components/menus/SaveOrMoveToStorySubMenu'
import { useBlockSuspense, useUser } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { usePushFocusedBlockIdState } from '@app/hooks/usePushFocusedBlockIdState'
import { useBlockSnapshot } from '@app/store/block'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { TELLERY_MIME_TYPES } from '@app/utils'
import { css } from '@emotion/css'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import React, { memo, ReactNode, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import invariant from 'tiny-invariant'
import { TellerySelectionType } from '../helpers'
import { useEditor } from '../hooks'
import { getSubsetOfBlocksSnapshot } from '../utils'

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
  const block = useBlockSuspense<Editor.Block>(id)
  const { data: user } = useUser(block?.lastEditedById ?? null)
  const editor = useEditor<Editor.Block>()
  const blockTranscations = useBlockTranscations()

  const deleteBlockHandler = useCallback(() => {
    blockTranscations.removeBlocks(block.storyId!, [id])
  }, [block.storyId, blockTranscations, id])
  const focusBlockHandler = usePushFocusedBlockIdState()
  const snapshot = useBlockSnapshot()

  const blockFragment = useMemo(() => {
    if (!snapshot) return null
    return {
      children: [block.id],
      data: getSubsetOfBlocksSnapshot(snapshot, [block.id])
    }
  }, [block.id, snapshot])

  const { t } = useTranslation()

  return (
    <>
      <StyledDropDownItem
        title={'Copy link'}
        icon={<IconCommonLink color={ThemingVariables.colors.text[0]} />}
        onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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
        }}
      />

      <StyledDropDownItem
        title={'Duplicate'}
        icon={<IconMenuDuplicate color={ThemingVariables.colors.text[0]} />}
        onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          e.preventDefault()
          e.stopPropagation()
          const selection = editor?.getSelection()
          editor?.duplicateHandler(selection?.type === TellerySelectionType.Block ? selection.selectedBlocks : [id])

          requestClose()
        }}
      />
      <SaveOrMoveToStorySubMenu
        blockFragment={blockFragment}
        mode="move"
        trigger={
          <StyledDropDownTriggerItem
            title={t`Move to story`}
            icon={<IconMenuMoveTo color={ThemingVariables.colors.text[0]} />}
          ></StyledDropDownTriggerItem>
        }
      />
      <MenuItemDivider />

      <StyledDropDownItem
        title={'Add block above'}
        icon={<IconMenuInsertBefore color={ThemingVariables.colors.text[0]} />}
        onClick={async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          e.preventDefault()
          e.stopPropagation()
          requestClose()
          invariant(editor, 'editor context is null')
          const newBlock = await editor?.insertNewEmptyBlock({ type: Editor.BlockType.Text }, id, 'top')
          invariant(newBlock, 'block not created')
          editor?.setSelectionState({
            type: TellerySelectionType.Inline,
            anchor: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
            focus: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
            storyId: newBlock.storyId!
          })
          focusBlockHandler(newBlock.id, newBlock.storyId, true)
        }}
      />

      <StyledDropDownItem
        title={'Add block below'}
        icon={<IconMenuInsertAfter color={ThemingVariables.colors.text[0]} />}
        onClick={async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          e.preventDefault()
          e.stopPropagation()
          requestClose()

          invariant(editor, 'editor context is null')

          const newBlock = await editor?.insertNewEmptyBlock({ type: Editor.BlockType.Text }, id, 'bottom')
          invariant(newBlock, 'block not created')
          editor?.setSelectionState({
            type: TellerySelectionType.Inline,
            anchor: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
            focus: { blockId: newBlock.id, nodeIndex: 0, offset: 0 },
            storyId: newBlock.storyId!
          })
          focusBlockHandler(newBlock.id, newBlock.storyId, true)
        }}
      />

      <StyledDropDownItem
        title={'Center align'}
        icon={<IconMenuCenterAlign color={ThemingVariables.colors.text[0]} />}
        onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          e.preventDefault()
          e.stopPropagation()
          editor?.updateBlockProps(id, ['format'], {
            ...block.format,
            textAlign: block.format?.textAlign === 'center' ? undefined : 'center'
          })
        }}
        side={<FormSwitch checked={block?.format?.textAlign === 'center'} readOnly />}
      />
      <MenuItemDivider />

      <StyledDropDownItem
        title={'Delete'}
        icon={<IconMenuDelete color={ThemingVariables.colors.text[0]} />}
        onClick={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
          e.preventDefault()
          e.stopPropagation()
          requestClose()

          // TODO: a workaround to transition
          setTimeout(() => {
            deleteBlockHandler()
          }, 100)
        }}
      />
      <MenuItemDivider />

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
