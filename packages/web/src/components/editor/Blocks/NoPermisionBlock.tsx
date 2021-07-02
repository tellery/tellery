import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import React from 'react'
import type { Editor } from 'types'

export const NoPermissionBlock: React.FC<{
  block: Editor.Block
}> = () => {
  return (
    <>
      <div
        className={css`
          height: 24px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          display: flex;
          padding: 30px;
          line-height: 1;
          font-size: 1em;
          background-color: ${ThemingVariables.colors.primary[5]};
          position: relative;
        `}
      >
        <div>Access Denied</div>
      </div>
    </>
  )
}
