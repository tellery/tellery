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
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          border-radius: 8px;
          outline: none;
          font-size: 14px;
          font-weight: 400;
          padding: 9px;
          height: 36px;
          width: 185px;
          box-sizing: border-box;

          &::placeholder {
            color: ${ThemingVariables.colors.gray[0]};
          }
        `,
        props.className
      )}
      placeholder={props.placeholder}
    />
  )
}
