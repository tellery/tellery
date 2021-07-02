import { css } from '@emotion/css'
import { ThemingVariables } from 'styles'

export function ConfigLabel(props: { children: string; top?: number; bottom?: number }) {
  return (
    <h3
      className={css`
        font-style: normal;
        font-weight: 500;
        font-size: 16px;
        line-height: 20px;
        color: ${ThemingVariables.colors.text[0]};
        margin-top: 24px;
        margin-bottom: 10px;
      `}
      style={{ marginTop: props.top, marginBottom: props.bottom }}
    >
      {props.children}
    </h3>
  )
}
