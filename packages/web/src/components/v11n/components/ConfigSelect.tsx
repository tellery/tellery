import { css, cx } from '@emotion/css'
import { TelleryThemeLight, ThemingVariables } from '@app/styles'
import { SVG2DataURI } from '@app/lib/svg'
import { IconCommonArrowDropDown } from '@app/assets/icons'
import { upperFirst } from 'lodash'
import { useTextWidth } from '@tag0/use-text-width'
import { fontFamily } from '../constants'

export function ConfigSelect(props: {
  className?: string
  options: string[]
  disabled?: boolean
  disables?: string[]
  value: string
  onChange(value: string): void
  title?: string
}) {
  const width = useTextWidth({ text: props.value, font: `12px ${fontFamily}` })

  return (
    <select
      title={props.title}
      disabled={props.disabled}
      className={cx(
        css`
          width: 100%;
          height: 32px;
          border: solid 1px transparent;
          border-radius: 4px;
          outline: none;
          font-style: normal;
          font-weight: normal;
          font-size: 12px;
          padding: 0 26px 0 6px;
          appearance: none;
          cursor: pointer;
          text-overflow: ellipsis;
          display: block;
          color: ${props.value ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[2]};
          background-image: ${SVG2DataURI(IconCommonArrowDropDown, TelleryThemeLight.colors.text[2])};
          background-repeat: no-repeat;
          background-position: ${width + 10}px 50%;
          :disabled {
            cursor: not-allowed;
          }
          :not(:disabled):hover {
            border: solid 1px ${ThemingVariables.colors.gray[1]};
            background-image: ${SVG2DataURI(IconCommonArrowDropDown, TelleryThemeLight.colors.text[0])};
            background-position: calc(100% - 6px) 50%;
          }
        `,
        props.className
      )}
      value={props.value}
      onChange={(e) => {
        props.onChange(e.target.value)
      }}
    >
      {props.options.map((option) => (
        <option key={option} value={option} disabled={props.disables?.includes(option)}>
          {upperFirst(option)}
        </option>
      ))}
    </select>
  )
}
