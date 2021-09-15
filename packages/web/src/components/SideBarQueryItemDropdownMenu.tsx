import { IconCommonBackLink, IconCommonCopy, IconCommonMore, IconCommonSql } from '@app/assets/icons'
import { MenuItem } from '@app/components/MenuItem'
import { useOpenStory } from '@app/hooks'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import copy from 'copy-to-clipboard'
import { motion } from 'framer-motion'
import React, { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { useTippyMenuAnimation } from '../hooks/useTippyMenuAnimation'
import IconButton from './kit/IconButton'
import { LazyTippy } from './LazyTippy'
import { MenuWrapper } from './MenuWrapper'

export const SideBarQueryItemDropdownMenuContent: React.FC<{
  block: Editor.DataAssetBlock
  onClose: () => void
  storyId: string
  visualizationsCount: number
}> = ({ block, onClose, storyId, visualizationsCount }) => {
  // const blockTranscations = useBlockTranscations()
  // const permissions = useStoryPermissions(block.id)
  const { t } = useTranslation()
  const openStory = useOpenStory()
  const questionEditor = useQuestionEditor(storyId)

  // const duplicateQueryHandler = useCallback(async () => {
  //   onClose()
  //   const newBlock = createEmptyBlock({
  //     type: block.type,
  //     storyId,
  //     parentId: storyId,
  //     content: { ...block.content, title: addPrefixToBlockTitle(block.content?.title, 'copy of') }
  //   })
  //   const newBlocks = [newBlock]
  //   await blockTranscations.insertBlocks(storyId, {
  //     blocksFragment: {
  //       children: newBlocks.map((block) => block.id),
  //       data: newBlocks.reduce((a, c) => {
  //         a[c.id] = c
  //         return a
  //       }, {} as Record<string, Editor.BaseBlock>)
  //     },
  //     targetBlockId: storyId,
  //     direction: 'child'
  //   })
  //   questionEditor.open({ blockId: newBlock.id, storyId: newBlock.storyId! })
  // }, [onClose, block.type, block.content, storyId, blockTranscations, questionEditor])

  return (
    <MenuWrapper>
      <MenuItem
        icon={<IconCommonSql color={ThemingVariables.colors.text[0]} />}
        title={t`Edit SQL`}
        onClick={(e) => {
          questionEditor.open({ blockId: block.id, storyId: block.storyId! })
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
      {/* {permissions.canWrite && (
        <>
          <MenuItem
            icon={<IconMenuDuplicate color={ThemingVariables.colors.text[0]} />}
            title={t`Duplicate`}
            onClick={duplicateQueryHandler}
          />
          <MenuItemDivider />
          <MenuConfirmPopover
            width={180}
            disabled={visualizationsCount !== 0}
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
              disabled={visualizationsCount !== 0}
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
      )} */}
    </MenuWrapper>
  )
}

const _SideBarQueryItemDropdownMenu: React.FC<{
  block: Editor.DataAssetBlock
  storyId: string
  show: boolean
  visualizationsCount: number
}> = ({ block, storyId, show, visualizationsCount }) => {
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
            visualizationsCount={visualizationsCount}
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

export const SideBarQueryItemDropdownMenu = memo(_SideBarQueryItemDropdownMenu)
