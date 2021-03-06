import { cx, css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'

export function ConfigInput(props: {
  value: string
  onChange(value: string): void
  onBlur?(): void
  className?: string
  placeholder?: string
}) {
  return (
    <input
      value={props.value}
      onChange={(e) => {
        props.onChange(e.target.value)
      }}
      placeholder={props.placeholder || 'placeholder'}
      onBlur={props.onBlur}
      className={cx(
        props.className,
        css`
          height: 32px;
          width: 100%;
          border-radius: 4px;
          border: 1px solid transparent;
          outline: none;
          font-style: normal;
          font-weight: normal;
          font-size: 12px;
          line-height: 14px;
          padding: 9px 6px;
          box-sizing: border-box;

          :hover {
            border: 1px solid ${ThemingVariables.colors.primary[2]};
          }
          &::placeholder {
            color: ${ThemingVariables.colors.text[2]};
          }
        `
      )}
    />
  )
}
