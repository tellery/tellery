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
          width: 100%;
          height: 32px;
          border: 1px solid transparent;
          border-radius: 4px;
          outline: none;
          font-style: normal;
          font-weight: normal;
          font-size: 12px;
          padding: 0 26px 0 6px;
          appearance: none;
          background-repeat: no-repeat;
          background-position: calc(100% - 6px) 50%;
          cursor: pointer;
          text-overflow: ellipsis;
          display: block;
          color: ${props.value ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[2]};
          background-image: ${SVG2DataURI(
            IconCommonArrowDropDown,
            TelleryThemeLight.colors.text[props.disabled ? 2 : 0]
          )};
          :disabled {
            cursor: not-allowed;
          }
          :not(:disabled) :focus,
          :not(:disabled) :active,
          :not(:disabled) :hover {
            border: 1px solid ${ThemingVariables.colors.primary[2]};
          }
        `,
        props.className
      )}
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
