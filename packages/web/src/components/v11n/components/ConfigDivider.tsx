import { css } from '@emotion/css'

export function ConfigDivider() {
  return (
    <div
      className={css`
        border-bottom: 1px solid #dedede;
        height: 1px;
        width: 100%;
      `}
    />
  )
}
