import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'

export default function FilterPopover(props: {
  value: Editor.SmartQueryBlock['content']['filters']
  onChange(value: Editor.SmartQueryBlock['content']['filters']): void
}) {
  return (
    <div
      className={css`
        width: 488px;
        border-radius: 10px;
        background-color: ${ThemingVariables.colors.gray[5]};
        box-shadow: ${ThemingVariables.boxShadows[0]};
      `}
    >
      123
    </div>
  )
}
