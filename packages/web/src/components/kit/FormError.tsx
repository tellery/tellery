import { css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'

export default function FormError(props: { message: string }) {
  return (
    <span
      className={css`
        font-weight: 600;
        font-size: 12px;
        line-height: 14px;
        color: ${ThemingVariables.colors.negative[0]};
        margin-top: 5px;
        display: block;
      `}
    >
      {props.message}
    </span>
  )
}
