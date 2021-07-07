import { cx, css } from '@emotion/css'
import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import { ThemingVariables } from 'styles'

export default forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: unknown }>(
  function FormInput(props, ref) {
    const { className, ...restProps } = props

    return (
      <input
        ref={ref}
        className={cx(
          css`
            border: 1px solid ${ThemingVariables.colors.gray[1]};
            border-radius: 8px;
            outline: none;
            font-size: 14px;
            font-weight: normal;
            padding: 0 15px;
            height: 36px;
            box-sizing: border-box;
            width: 100%;
            background-color: ${ThemingVariables.colors.gray[5]};
            color: ${ThemingVariables.colors.text[0]};
            &::placeholder {
              color: ${ThemingVariables.colors.text[2]};
            }
            &:focus {
              border: 1px solid ${ThemingVariables.colors.primary[1]};
            }
          `,
          props.error
            ? css`
                border: 1px solid ${ThemingVariables.colors.negative[0]} !important;
              `
            : undefined,
          className
        )}
        {...restProps}
      />
    )
  }
)
