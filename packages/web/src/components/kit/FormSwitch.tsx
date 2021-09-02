import { css, cx } from '@emotion/css'
import { forwardRef, InputHTMLAttributes } from 'react'
import { ThemingVariables } from '@app/styles'

export default forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function FormSwitch(props, ref) {
  return (
    <label
      className={cx(
        css`
          position: relative;
          display: inline-block;
          width: 30px;
          height: 16px;
          flex-shrink: 0;

          input:checked + span {
            background-color: ${ThemingVariables.colors.primary[1]};
          }

          input:checked + span:before {
            transform: translateX(14px);
          }
        `,
        props.disabled &&
          css`
            input:checked + span {
              background-color: ${ThemingVariables.colors.primary[2]};
            }
          `
      )}
    >
      <input
        ref={ref}
        checked={props.checked}
        onChange={props.onChange}
        {...props}
        type="checkbox"
        className={css`
          opacity: 0;
          width: 0;
          height: 0;
        `}
      />
      <span
        className={cx(
          css`
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: ${ThemingVariables.colors.text[2]};
            transition: 0.2s ease;
            border-radius: 24px;

            &:before {
              position: absolute;
              content: '';
              height: 12px;
              width: 12px;
              left: 2px;
              bottom: 2px;
              background-color: ${ThemingVariables.colors.gray[5]};
              transition: 0.2s ease;
              border-radius: 50%;
            }
          `,
          props.disabled &&
            css`
              &:before {
                background: ${ThemingVariables.colors.gray[1]};
              }
              background-color: ${ThemingVariables.colors.gray[0]};
              cursor: not-allowed;
            `
        )}
      />
    </label>
  )
})
