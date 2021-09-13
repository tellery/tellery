import { css, cx } from '@emotion/css'

import { TelleryThemeLight, ThemingVariables } from '@app/styles'
import { SVG2DataURI } from '@app/lib/svg'
import { IconCommonArrowDropDown } from '@app/assets/icons'
import { upperFirst } from 'lodash'

export function ConfigSelect(props: {
  className?: string
  options: string[]
  disabled?: boolean
  disables?: string[]
  value?: string
  onChange(value: string): void
  placeholder?: string
}) {
  return (
    <select
      disabled={props.disabled}
      className={cx(
        css`
          width: 160px;
          height: 32px;
          border: none;
          outline: none;
          font-style: normal;
          font-weight: normal;
          font-size: 12px;
          padding: 9px 26px 9px 6px;
          appearance: none;
          background-repeat: no-repeat;
          background-position: calc(100% - 6px) 50%;
          cursor: pointer;
          text-overflow: ellipsis;
          display: block;
          color: ${props.value ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[1]};
          :disabled {
            cursor: not-allowed;
          }
        `,
        props.className
      )}
      style={{
        backgroundImage: SVG2DataURI(IconCommonArrowDropDown, TelleryThemeLight.colors.text[0])
      }}
      value={props.value}
      onChange={(e) => {
        props.onChange(e.target.value)
      }}
    >
      {props.placeholder ? (
        <option value="" disabled={true}>
          {props.placeholder}
        </option>
      ) : null}
      {props.options.map((option) => (
        <option key={option} value={option} disabled={props.disables?.includes(option)}>
          {upperFirst(option)}
        </option>
      ))}
    </select>
  )
}
