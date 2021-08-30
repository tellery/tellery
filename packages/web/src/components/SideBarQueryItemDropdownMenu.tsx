import {
  IconCommonBackLink,
  IconCommonCopy,
  IconCommonMore,
  IconCommonSql,
  IconMenuDelete,
  IconMenuDuplicate
} from '@app/assets/icons'
import { MenuItem } from '@app/components/MenuItem'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { createEmptyBlock } from '@app/helpers/blockFactory'
import { useOpenStory } from '@app/hooks'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { useStoryPermissions } from '@app/hooks/useStoryPermissions'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DEFAULT_TITLE } from '@app/utils'
import { css } from '@emotion/css'
import copy from 'copy-to-clipboard'
import { motion } from 'framer-motion'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { useTippyMenuAnimation } from '../hooks/useTippyMenuAnimation'
import { mergeTokens } from './editor'
import { FormButton } from './kit/FormButton'
import IconButton from './kit/IconButton'
import { LazyTippy } from './LazyTippy'
import { MenuConfirmPopover } from './MenuConfirmPopover'
import { MenuWrapper } from './MenuWrapper'

export const SideBarQueryItemDropdownMenuContent: React.FC<{
  block: Editor.DataAssetBlock
  onClose: () => void
  storyId: string
}> = ({ block, onClose, storyId }) => {
  const blockTranscations = useBlockTranscations()
  const permissions = useStoryPermissions(block.id)
  const { t } = useTranslation()
  const openStory = useOpenStory()
  const questionEditor = useQuestionEditor(storyId)

  const duplicateQueryHandler = useCallback(async () => {
    onClose()
    const newBlock = createEmptyBlock({
      type: block.type,
      storyId,
      parentId: storyId,
      content: { ...block.content, title: mergeTokens([[`copy of `], ...(block.content?.title ?? [[DEFAULT_TITLE]])]) }
    })
    const newBlocks = [newBlock]
    await blockTranscations.insertBlocks(storyId, {
      blocksFragment: {
        children: newBlocks.map((block) => block.id),
        data: newBlocks.reduce((a, c) => {
          a[c.id] = c
          return a
        }, {} as Record<string, Editor.BaseBlock>)
      },
      targetBlockId: storyId,
      direction: 'child',
      path: 'resources'
    })
    questionEditor.open({ mode: 'SQL', blockId: newBlock.id, storyId: newBlock.storyId! })
  }, [onClose, block.type, block.content, storyId, blockTranscations, questionEditor])

  return (
    <MenuWrapper>
      <MenuItem
        icon={<IconCommonSql color={ThemingVariables.colors.text[0]} />}
        title={t`Edit SQL`}
        onClick={(e) => {
          questionEditor.open({ mode: 'SQL', blockId: block.id, storyId: block.storyId! })
          onClose()
        }}
      />
      {block.storyId !== storyId && (
        <MenuItem
          icon={<IconCommonBackLink color={ThemingVariables.colors.text[0]} />}
          title={t`Navigate to the original story`}
          onClick={(e) => {
            openStory(block.storyId!, { blockId: block.id })
            onClose()
          }}
        />
      )}
      <MenuItem
        icon={<IconCommonCopy color={ThemingVariables.colors.text[0]} />}
        title={t`Copy link`}
        onClick={() => {
          copy(window.location.href)
          toast.success('Link copied')
          onClose()
          // setOpen(false)
        }}
      />
      <MenuItem
        icon={<IconMenuDuplicate color={ThemingVariables.colors.text[0]} />}
        title={t`Duplicate`}
        onClick={duplicateQueryHandler}
      />
      {permissions.canWrite && (
        <>
          <MenuItemDivider />
          <MenuConfirmPopover
            width={180}
            content={
              <div>
                <div
                  className={css`
                    color: ${ThemingVariables.colors.text[0]};
                    font-size: 14px;
                    padding: 8px;
                    margin-bottom: 10px;
                  `}
                >
                  Delete this query?
                </div>
                <div
                  className={css`
                    display: flex;
                    justify-content: flex-end;
                  `}
                >
                  <FormButton
                    variant="danger"
                    onClick={async () => {
                      console.log(storyId, [block.id])
                      await blockTranscations.removeBlocks(storyId, [block.id], 'resources')
                    }}
                  >
                    Confirm
                  </FormButton>
                </div>
              </div>
            }
          >
            <MenuItem
              icon={<IconMenuDelete color={ThemingVariables.colors.negative[0]} />}
              title={
                <span
                  className={css`
                    color: ${ThemingVariables.colors.negative[0]};
                  `}
                >
                  Delete
                </span>
              }
            />
          </MenuConfirmPopover>
        </>
      )}
    </MenuWrapper>
  )
}

export const SideBarQueryItemDropdownMenu: React.FC<{ block: Editor.DataAssetBlock; storyId: string; show: boolean }> =
  ({ block, storyId, show }) => {
    const tippyAnimation = useTippyMenuAnimation('scale')
    const [displaying, setDisplaying] = useState(false)

    return (
      <LazyTippy
        render={(attrs, content, instance) => (
          <motion.div animate={tippyAnimation.controls} transition={{ duration: 0.15 }} {...attrs}>
            <SideBarQueryItemDropdownMenuContent
              block={block}
              storyId={storyId}
              onClose={() => {
                instance?.hide()
              }}
            />
          </motion.div>
        )}
        animation={true}
        onMount={() => {
          tippyAnimation.onMount()
          setDisplaying(true)
        }}
        onHide={(instance) => {
          tippyAnimation.onHide(instance, () => {
            setDisplaying(false)
          })
        }}
        hideOnClick={true}
        interactive
        trigger="click"
        placement="right-end"
        appendTo={document.body}
      >
        <IconButton
          icon={IconCommonMore}
          color={ThemingVariables.colors.text[0]}
          onClick={(e) => {
            e.stopPropagation()
          }}
          style={{
            display: displaying || show ? 'block' : 'none'
          }}
        />
      </LazyTippy>
    )
  }
