import { IconCommonClose } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import IconButton from './kit/IconButton'

export default function FilterPopover(props: {
  value: Editor.SmartQueryBlock['content']['filters']
  onChange(value: Editor.SmartQueryBlock['content']['filters']): void
  onClose(): void
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
      <div
        className={css`
          height: 48px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 500;
          font-size: 12px;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        <h3 className={css``}>Filter</h3>
        <IconButton icon={IconCommonClose} color={ThemingVariables.colors.text[0]} onClick={props.onClose} />
      </div>
    </div>
  )
}
