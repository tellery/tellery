import { useBlockSuspense, useConnectorsGetProfile } from '@app/hooks/api'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import React from 'react'
import { BlockTitle } from './editor'
import { MenuWrapper } from './MenuWrapper'
import { SQLViewer } from './SQLViewer'

export const SideBarInspectQueryBlockPopover: React.FC<{ blockId: string }> = ({ blockId }) => {
  const block = useBlockSuspense<Editor.QueryBlock>(blockId)
  const workspace = useWorkspace()
  const { data: profile } = useConnectorsGetProfile(workspace.preferences.connectorId)

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
        {profile && (
          <SQLViewer
            blockId={block.id!}
            languageId={profile.type}
            value={(block as Editor.SQLBlock).content?.sql ?? ''}
            padding={{ top: 10, bottom: 10 }}
          />
        )}
      </div>
    </MenuWrapper>
  )
}
