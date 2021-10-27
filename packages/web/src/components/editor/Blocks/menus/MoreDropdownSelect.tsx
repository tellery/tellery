import {
  IconCommonArrowDropDown,
  IconCommonLink,
  IconCommonLock,
  IconCommonMore,
  IconCommonRefresh,
  IconCommonSetting,
  IconCommonSql,
  IconCommonUnlock,
  IconMenuDelete,
  IconMenuDownload,
  IconMenuDuplicate
} from '@app/assets/icons'
import IconButton from '@app/components/kit/IconButton'
import { MenuItemDivider } from '@app/components/MenuItemDivider'
import { env } from '@app/env'
import { useBlockSuspense, useGetSnapshot, useUser } from '@app/hooks/api'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { useQuestionEditor } from '@app/hooks/useQuestionEditor'
import { useSideBarQuestionEditor } from '@app/hooks/useSideBarQuestionEditor'
import { useRefreshSnapshot } from '@app/hooks/useStorySnapshotManager'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { DEFAULT_TIPPY_DELAY, snapshotToCSV, TELLERY_MIME_TYPES } from '@app/utils'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import copy from 'copy-to-clipboard'
import dayjs from 'dayjs'
import download from 'downloadjs'
import html2canvas from 'html2canvas'
import React, { forwardRef, ReactNode, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import invariant from 'tiny-invariant'
import { TellerySelectionType } from '../../helpers'
import { getBlockImageById } from '../../helpers/contentEditable'
import { useEditor } from '../../hooks'
import { useBlockBehavior } from '../../hooks/useBlockBehavior'
import { isExecuteableBlockType } from '../utils'
import { PopoverMotionVariants } from '@app/styles/animations'
import { AnimatePresence, motion } from 'framer-motion'

export const StyledDropdownMenuContent: React.FC<{ open: boolean }> = ({ children, open }) => {
  return (
    <AnimatePresence>
      {open && (
        <DropdownMenu.Content asChild forceMount>
          <motion.div
            initial={'inactive'}
            animate={'active'}
            exit={'inactive'}
            transition={{ duration: 0.15 }}
            variants={PopoverMotionVariants.scale}
            className={css`
              background: ${ThemingVariables.colors.gray[5]};
              box-shadow: ${ThemingVariables.boxShadows[0]};
              border-radius: 8px;
              padding: 8px;
              width: 260px;
              overflow: hidden;
              outline: none;
              display: flex;
              flex-direction: column;
            `}
          >
            {children}
          </motion.div>
        </DropdownMenu.Content>
      )}
    </AnimatePresence>
  )
}

export const MoreDropdownSelect: React.FC<{
  block: Editor.VisualizationBlock
  className?: string
  hoverContent?: ReactNode
  setIsActive: (active: boolean) => void
}> = ({ block, setIsActive, className, hoverContent }) => {
  const { data: user } = useUser(block?.lastEditedById ?? null)
  const editor = useEditor<Editor.VisualizationBlock>()
  const { readonly } = useBlockBehavior()
  const queryBlock = useBlockSuspense<Editor.QueryBlock>(block.content?.queryId!)
  const canConvertDataAsset = !readonly && queryBlock.storyId === block.storyId
  const getSnapshot = useGetSnapshot()
  const questionEditor = useQuestionEditor(block.storyId!)
  const sideBarQuestionEditor = useSideBarQuestionEditor(block.storyId!)
  const { t } = useTranslation()
  const mutateSnapshot = useRefreshSnapshot(block.storyId!)
  const canRefresh = !readonly && isExecuteableBlockType(queryBlock.type)
  const blockTranscations = useBlockTranscations()
  const [open, setOpen] = useState(false)
  const [subMenuOpen, setSubMenuOpen] = useState(false)

  const closeMenu = useCallback(() => {
    setIsActive(false)
    setOpen(false)
  }, [setIsActive])

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        setIsActive(open)
        setOpen(open)
      }}
      open={open}
    >
      <DropdownMenu.Trigger asChild>
        <IconButton
          hoverContent={hoverContent}
          icon={IconCommonMore}
          color={ThemingVariables.colors.gray[5]}
          className={cx(
            css`
              border: none;
              outline: none;
              display: flex;
              align-items: center;
              justify-content: center;
              outline: none;
              border: none;
              border-radius: 4px;
              font-size: 16px;
              font-weight: 500;
              padding: 0;
              cursor: pointer;
              background: transparent;
            `,
            className
          )}
        ></IconButton>
      </DropdownMenu.Trigger>
      <StyledDropdownMenuContent open={open}>
        <StyledDropDownItem
          title={t`Copy Link`}
          icon={<IconCommonLink color={ThemingVariables.colors.text[0]} />}
          onClick={(e) => {
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
            closeMenu()
          }}
        />
        {env.VITE_ENABLE_EMBED && (
          <StyledDropDownItem
            title={t`Copy Embed Link`}
            icon={<IconCommonLink color={ThemingVariables.colors.text[0]} />}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              copy('placeholder', {
                onCopy: (clipboardData) => {
                  invariant(block, 'block is null')
                  const dataTranser = clipboardData as DataTransfer
                  dataTranser.setData(
                    'text/plain',
                    `${window.location.protocol}//${window.location.host}/embed/${block?.id}`
                  )
                }
              })
              toast('Link Copied')
              closeMenu()
            }}
          />
        )}
        <StyledDropDownItem
          title={t`Duplicate`}
          icon={<IconMenuDuplicate color={ThemingVariables.colors.text[0]} />}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            const selection = editor?.getSelection()
            editor?.duplicateHandler(
              selection?.type === TellerySelectionType.Block ? selection.selectedBlocks : [block.id]
            )
            closeMenu()
          }}
        />
        <MenuItemDivider />
        {canRefresh && (
          <StyledDropDownItem
            title={t`Refresh`}
            icon={<IconCommonRefresh color={ThemingVariables.colors.text[0]} />}
            onClick={() => {
              mutateSnapshot.execute(queryBlock)
              closeMenu()
            }}
          />
        )}
        <StyledDropDownItem
          title={t`Settings`}
          icon={<IconCommonSetting color={ThemingVariables.colors.text[0]} />}
          onClick={() => {
            sideBarQuestionEditor.open({ blockId: block.id, activeTab: 'Visualization' })
            closeMenu()
          }}
        />
        <StyledDropDownItem
          title={t`Open in editor`}
          icon={<IconCommonSql color={ThemingVariables.colors.text[0]} />}
          onClick={() => {
            questionEditor.open({ blockId: block.id, storyId: block.storyId! })
            closeMenu()
          }}
        />
        <DropdownMenu.Root
          open={subMenuOpen}
          onOpenChange={(open) => {
            setSubMenuOpen(open)
          }}
        >
          <StyledDropDownTriggerItem
            title={t`Download as`}
            icon={<IconMenuDownload color={ThemingVariables.colors.text[0]} />}
          ></StyledDropDownTriggerItem>
          <StyledDropdownMenuContent open={subMenuOpen}>
            <StyledDropDownItem
              title={'Download as CSV'}
              icon={<IconMenuDownload color={ThemingVariables.colors.text[0]} />}
              onClick={async () => {
                closeMenu()
                setTimeout(async () => {
                  const snapshot = await getSnapshot({ snapshotId: queryBlock?.content?.snapshotId })
                  const snapshotData = snapshot?.data
                  invariant(snapshotData, 'snapshotData is null')
                  const csvString = snapshotToCSV(snapshotData)
                  invariant(csvString, 'csvString is null')
                  csvString && download(csvString, 'data.csv', 'text/csv')
                }, 0)
              }}
            />
            <StyledDropDownItem
              title={'Download as image'}
              icon={<IconMenuDownload color={ThemingVariables.colors.text[0]} />}
              onClick={async () => {
                closeMenu()
                setTimeout(() => {
                  const elementSVG = getBlockImageById(block.id)
                  if (elementSVG) {
                    html2canvas(elementSVG!, {
                      foreignObjectRendering: false
                    }).then(function (canvas) {
                      const dataUrl = canvas.toDataURL('image/png')
                      download(dataUrl, 'image.png', 'image/png')
                    })
                  }
                }, 0)
              }}
            />
            <DropdownMenu.Arrow />
          </StyledDropdownMenuContent>
        </DropdownMenu.Root>

        {canConvertDataAsset && queryBlock.type === Editor.BlockType.SQL && (
          <Tippy
            content="Freeze the data returned by the query to prevent accidental refreshing."
            placement="left"
            maxWidth={260}
            delay={DEFAULT_TIPPY_DELAY}
            arrow={false}
          >
            <StyledDropDownItem
              title={'Freeze data'}
              icon={<IconCommonLock color={ThemingVariables.colors.text[0]} />}
              onClick={async () => {
                editor?.updateBlockProps?.(queryBlock.id, ['type'], Editor.BlockType.SnapshotBlock)
                closeMenu()
              }}
            />
          </Tippy>
        )}
        {canConvertDataAsset && queryBlock.type === Editor.BlockType.SnapshotBlock && (
          <StyledDropDownItem
            title={'Unfreeze data'}
            icon={<IconCommonUnlock color={ThemingVariables.colors.text[0]} />}
            onClick={async () => {
              editor?.updateBlockProps?.(queryBlock.id, ['type'], Editor.BlockType.SQL)
              closeMenu()
            }}
          />
        )}
        <MenuItemDivider />

        {!readonly && (
          <StyledDropDownItem
            title={'Delete'}
            icon={<IconMenuDelete color={ThemingVariables.colors.text[0]} />}
            onClick={async () => {
              // requestClose()
              // TODO: a workaround to transition
              setTimeout(() => {
                blockTranscations.removeBlocks(block.storyId!, [block.id])
              }, 100)
            }}
          />
        )}

        {block?.lastEditedById && (
          <>
            <MenuItemDivider />
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
      </StyledDropdownMenuContent>

      {/*
                   
                   
                  </motion.div>
                )}
              </AnimatePresence>
            </Menu> */}
    </DropdownMenu.Root>
  )
}
type SyltedMenuItemProps = {
  icon?: ReactNode
  title: ReactNode
  side?: ReactNode
  isActive?: boolean
  size?: 'small' | 'medium' | 'large'
  onClick?: React.MouseEventHandler<HTMLButtonElement>
} & React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

const StyledMenuItem = forwardRef<HTMLDivElement, SyltedMenuItemProps>((props, ref) => {
  const { size = 'medium', title, side, isActive, onClick, icon, children, ...rest } = props
  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        size === 'small' &&
          css`
            height: 24px;
          `,
        size === 'medium' &&
          css`
            height: 36px;
          `,
        size === 'large' &&
          css`
            height: 44px;
          `,
        css`
          border-radius: 8px;
          padding: 0px 8px;
          outline: none;
          border: none;
          width: 100%;
          background: transparent;
          box-sizing: border-box;
          cursor: pointer;
          transition: all 0.1s ease;
          display: block;
          color: ${ThemingVariables.colors.text[0]};
          font-size: 12px;
          line-height: 14px;
          text-decoration: none;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          display: flex;
          align-items: center;
          &:hover {
            background: ${ThemingVariables.colors.primary[4]};
          }
          &:active {
            background: ${ThemingVariables.colors.primary[3]};
          }
        `,
        props.isActive &&
          css`
            background: ${ThemingVariables.colors.primary[3]};
          `
      )}
      onClick={props.onClick}
    >
      {props?.icon}
      <span
        className={css`
          margin-left: 8px;
        `}
      >
        {props.title}
      </span>
      {props.side && (
        <div
          className={css`
            margin-left: auto;
          `}
        >
          {props.side}
        </div>
      )}
    </div>
  )
})

StyledMenuItem.displayName = 'StyledMenuItem'

const StyledDropDownItem = forwardRef<HTMLDivElement, SyltedMenuItemProps>((props, ref) => {
  return (
    <DropdownMenu.Item asChild>
      <StyledMenuItem {...props} ref={ref} />
    </DropdownMenu.Item>
  )
})
StyledDropDownItem.displayName = 'StyledDropDownItem'

const StyledDropDownTriggerItem = forwardRef<HTMLDivElement, SyltedMenuItemProps>((props, ref) => {
  return (
    <DropdownMenu.TriggerItem asChild>
      <StyledMenuItem
        {...props}
        ref={ref}
        side={
          <IconCommonArrowDropDown
            className={css`
              transform: rotate(-90deg);
            `}
          />
        }
      />
    </DropdownMenu.TriggerItem>
  )
})

StyledDropDownTriggerItem.displayName = 'StyledDropDownTriggerItem'
