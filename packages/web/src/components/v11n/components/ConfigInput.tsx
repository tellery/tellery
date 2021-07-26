import { cx, css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'

export function ConfigInput(props: {
  value: string
  onChange(value: string): void
  className?: string
  placeholder?: string
}) {
  return (
    <input
      value={props.value}
      onChange={(e) => {
        props.onChange(e.target.value)
      }}
      className={cx(
        props.className,
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
        `
      )}
      placeholder={props.placeholder}
    />
  )
}
