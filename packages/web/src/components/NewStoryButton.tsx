import { IconCommonAdd } from '@app/assets/icons'
import { useBlockTranscations } from '@app/hooks/useBlockTranscation'
import { ThemingVariables } from '@app/styles'
import { blockIdGenerator } from '@app/utils'
import { waitForTranscationApplied } from '@app/utils/oberveables'
import type { Placement } from '@popperjs/core'
import Tippy from '@tippyjs/react'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

export const NewStoryButton: React.FC<{ classname: string; tipPlacement?: Placement }> = ({
  classname,
  tipPlacement = 'right'
}) => {
  const blockTranscations = useBlockTranscations()
  const navigate = useNavigate()

  const handleCreateNewSotry = useCallback(async () => {
    const id = blockIdGenerator()
    const [transcationId] = blockTranscations.createNewStory({ id: id })
    await waitForTranscationApplied(transcationId)
    navigate(`/story/${id}`, {
      state: { focusTitle: true }
    })
  }, [blockTranscations, navigate])
  const { t } = useTranslation()

  return (
    <Tippy content={t`Create a new story`} hideOnClick={false} arrow={false} placement={tipPlacement}>
      <div className={classname} onClick={handleCreateNewSotry}>
        <IconCommonAdd width={20} height={20} color={ThemingVariables.colors.text[0]} />
      </div>
    </Tippy>
  )
}
