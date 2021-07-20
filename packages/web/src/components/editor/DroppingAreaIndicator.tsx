import { useDroppingAreaBlock } from '@app/hooks/useDroppingArea'
import { css } from '@emotion/css'
import React, { memo } from 'react'
import { ThemingVariables } from 'styles'

const _DroppingAreaIndicator: React.FC<{
  blockId: string
}> = ({ blockId }) => {
  const droppingArea = useDroppingAreaBlock(blockId)

  return (
    <>
      {droppingArea?.blockId === blockId && droppingArea?.direction === 'top' && (
        <div
          className={css`
            position: absolute;
            top: -4px;
            left: 0;
            width: 100%;
            border-top: 4px solid ${ThemingVariables.colors.primary[3]};
          `}
        ></div>
      )}
      {droppingArea?.blockId === blockId && droppingArea?.direction === 'left' && (
        <div
          className={css`
            position: absolute;
            top: 0;
            left: -4px;
            height: 100%;
            border-left: 4px solid ${ThemingVariables.colors.primary[3]};
          `}
        ></div>
      )}
      {droppingArea?.blockId === blockId && droppingArea?.direction === 'right' && (
        <div
          className={css`
            position: absolute;
            top: 0;
            right: -4px;
            height: 100%;
            border-right: 4px solid ${ThemingVariables.colors.primary[3]};
          `}
        ></div>
      )}
      {droppingArea?.blockId === blockId && droppingArea?.direction === 'bottom' && (
        <div
          className={css`
            position: absolute;
            bottom: -4px;
            left: 0;
            width: 100%;
            border-bottom: 4px solid ${ThemingVariables.colors.primary[3]};
          `}
        ></div>
      )}
    </>
  )
}

export const DroppingAreaIndicator = memo(_DroppingAreaIndicator)
