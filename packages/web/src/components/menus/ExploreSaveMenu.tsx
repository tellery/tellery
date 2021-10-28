import { useAllThoughts } from '@app/hooks/api'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { Editor } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { css } from '@emotion/css'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import dayjs from 'dayjs'
import React, { ReactNode, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { StyledDropDownItem, StyledDropdownMenuContent, StyledDropDownTriggerItem } from '../kit/DropDownMenu'
import { useMoveOrSaveToStory } from '../../hooks/useMoveOrSaveToStory'
import { SaveOrMoveToStorySubMenu } from './SaveOrMoveToStorySubMenu'

export const ExploreSaveMenu: React.FC<{
  blockFragment: { children: string[]; data: Record<string, Editor.BaseBlock> } | null
  className?: string
  button: ReactNode
}> = ({ blockFragment, className, children, button }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data: thoughts } = useAllThoughts()
  const blockTranscations = useBlockTranscations()

  const closeMenu = useCallback(() => {
    setOpen(false)
  }, [])

  const saveToStory = useMoveOrSaveToStory(blockFragment, 'save')

  const saveToTodaysThought = useCallback(async () => {
    if (!thoughts || !blockFragment) return
    const today = dayjs().format('YYYY-MM-DD')
    let storyId = null
    if (thoughts.length >= 1 && thoughts[0].date === today) {
      storyId = thoughts[0].id
    } else {
      const thoughtId = blockIdGenerator()
      await blockTranscations.createNewThought({ id: thoughtId })
      storyId = thoughtId
    }
    saveToStory(storyId)
  }, [blockFragment, blockTranscations, saveToStory, thoughts])

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
        <SaveOrMoveToStorySubMenu
          blockFragment={blockFragment}
          mode="save"
          trigger={<StyledDropDownTriggerItem title={t`Save to story`}></StyledDropDownTriggerItem>}
        />

        <StyledDropDownItem
          title={t`Save to thoughts`}
          onClick={async (e) => {
            await saveToTodaysThought()
            toast('Question saved to thoughts')
            closeMenu()
          }}
        />
      </StyledDropdownMenuContent>
    </DropdownMenu.Root>
  )
}
