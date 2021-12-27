import { IconCommonSearch } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import React from 'react'

export const SearchInput: React.FC<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
> = (props) => {
  return (
    <div
      className={css`
        position: relative;
        flex: 1;
        padding: 8px 10px;
        border-bottom: 1px solid ${ThemingVariables.colors.gray[1]};
      `}
    >
      <input
        {...props}
        className={css`
          flex-shrink: 0;
          width: 100%;
          height: 32px;
          background: ${ThemingVariables.colors.gray[5]};
          border: none;
          outline: none;
          box-sizing: border-box;
          padding-left: 36px;

          &::placeholder {
            font-size: 12px;
            line-height: 14px;
            color: ${ThemingVariables.colors.gray[0]};
          }
        `}
      ></input>
      <IconCommonSearch
        color={ThemingVariables.colors.gray[0]}
        className={css`
          position: absolute;
          left: 18px;
          z-index: 999;
          top: 50%;
          color: ${ThemingVariables.colors.gray[0]};
          display: inline-block;
          transform: translateY(-50%);
          width: 20px;
          height: 20px;
        `}
      />
    </div>
  )
}
