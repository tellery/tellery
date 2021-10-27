import { IconCommonLink } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { TELLERY_MIME_TYPES } from '@app/utils'
import { css } from '@emotion/css'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import copy from 'copy-to-clipboard'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ReactNode } from 'react-router/node_modules/@types/react'
import { toast } from 'react-toastify'
import invariant from 'tiny-invariant'
import { StyledDropDownItem, StyledDropdownMenuContent } from '../kit/DropDownMenu'

export const ExploreSaveMenu: React.FC<{
  block: Editor.VisualizationBlock | null
  className?: string
  button: ReactNode
}> = ({ block, className, children, button }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <DropdownMenu.Root
      onOpenChange={(open) => {
        setOpen(open)
      }}
      open={open}
    >
      <DropdownMenu.Trigger asChild>{button}</DropdownMenu.Trigger>

      <StyledDropdownMenuContent
        open={open}
        className={css`
          width: 250px;
        `}
        sideOffset={10}
        side={'bottom'}
      >
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
      </StyledDropdownMenuContent>
    </DropdownMenu.Root>
  )
}
