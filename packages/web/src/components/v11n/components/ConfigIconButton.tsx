import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import { ButtonHTMLAttributes, FunctionComponent, SVGAttributes } from 'react'

export default function ConfigIconButton(
  props: ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: FunctionComponent<SVGAttributes<SVGElement>>
    color?: string
  }
) {
  const { className, ...restProps } = props
  const color = props.disabled ? ThemingVariables.colors.text[2] : props.color || ThemingVariables.colors.text[0]

  return (
    <button
      {...restProps}
      className={cx(
        css`
          width: 32px;
          height: 32px;
          padding: 6px;
          border-radius: 4px;
          outline: none;
          border: none;
          background-color: transparent;
          :hover {
            cursor: pointer;
            background-color: ${ThemingVariables.colors.primary[5]};
          }
        `,
        className
      )}
    >
      {props.icon({ color })}
    </button>
  )
}
