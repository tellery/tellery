import { useBlockSuspense } from '@app/hooks/api'
import { useProfileType } from '@app/hooks/useProfileType'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React from 'react'
import { BlockTitle } from './editor'
import { MenuWrapper } from './MenuWrapper'
import { SQLViewer } from './SQLViewer'

export const SideBarInspectQueryBlockPopover: React.FC<{ blockId: string }> = ({ blockId }) => {
  const block = useBlockSuspense<Editor.DataAssetBlock>(blockId)
  const profileType = useProfileType()

  return (
    <MenuWrapper>
      <div
        className={css`
          color: ${ThemingVariables.colors.text[0]};
          font-size: 14px;
        `}
      >
        <BlockTitle block={block} />
      </div>
      <div
        className={css`
          height: 300px;
        `}
      >
        {profileType && (
          <SQLViewer
            blockId={block.id!}
            languageId={profileType!}
            value={block.content?.sql ?? ''}
            padding={{ top: 10, bottom: 10 }}
          />
        )}
      </div>
    </MenuWrapper>
  )
}
