import { css, cx } from '@emotion/css'
import type { ButtonHTMLAttributes } from 'react'
import { ThemingVariables } from '@app/styles'
import { CircularLoading } from '../CircularLoading'

export function FormButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant: 'primary' | 'secondary' | 'danger'
    loading?: boolean
  }
) {
  const { className, children, disabled, loading, ...restProps } = props

  return (
    <button
      {...restProps}
      disabled={loading || disabled}
      className={cx(
        css`
          position: relative;
          outline: none;
          text-align: center;
          vertical-align: middle;
          font-size: 14px;
          padding: 0 15px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          &:disabled {
            font-weight: unset;
            cursor: not-allowed;
            color: ${loading ? ThemingVariables.colors.gray[1] : ThemingVariables.colors.text[1]};
            background-color: ${ThemingVariables.colors.gray[1]};
            border: 1px solid ${ThemingVariables.colors.gray[1]};
          }
        `,
        {
          primary: css`
            font-weight: normal;
            color: ${ThemingVariables.colors.gray[5]};
            background-color: ${ThemingVariables.colors.primary[1]};
            border: 1px solid ${ThemingVariables.colors.primary[1]};
          `,
          secondary: css`
            font-weight: 600;
            color: ${ThemingVariables.colors.primary[1]};
            background-color: ${ThemingVariables.colors.gray[5]};
            border: 1px solid ${ThemingVariables.colors.primary[1]};
          `,
          danger: css`
            font-weight: 600;
            color: ${ThemingVariables.colors.negative[0]};
            background-color: ${ThemingVariables.colors.gray[5]};
            border: 1px solid ${ThemingVariables.colors.negative[0]};
          `
        }[props.variant],
        className
      )}
    >
      {children}
      {loading ? (
        <CircularLoading
          size={30}
          color={ThemingVariables.colors.text[1]}
          className={css`
            position: absolute;
            left: calc(50% - 15px);
            top: calc(50% - 15px);
          `}
        />
      ) : null}
    </button>
  )
}
