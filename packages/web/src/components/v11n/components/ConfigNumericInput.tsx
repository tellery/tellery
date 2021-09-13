import { cx, css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'

export function ConfigNumericInput(props: {
  value?: number
  onChange(value?: number): void
  min?: number
  max?: number
  className?: string
  placeholder?: string
}) {
  return (
    <input
      type="number"
      value={props.value === undefined ? '' : props.value}
      onChange={(e) => {
        props.onChange(e.target.valueAsNumber)
      }}
      min={props.min}
      max={props.max}
      className={cx(
        css`
          height: 32px;
          width: 160px;
          border-radius: 4px;
          border: 1px solid transparent;
          outline: none;
          font-style: normal;
          font-weight: normal;
          font-size: 12px;
          line-height: 14px;
          padding: 9px 6px;
          box-sizing: border-box;

          :focus,
          :active,
          :hover {
            border: 1px solid ${ThemingVariables.colors.primary[2]};
          }
          &::placeholder {
            color: ${ThemingVariables.colors.text[2]};
          }
        `,
        props.className
      )}
      placeholder={props.placeholder}
    />
  )
}
