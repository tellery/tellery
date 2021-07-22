import { css, cx } from '@emotion/css'

import { ThemingVariables } from '@app/styles'
import { SVG2DataURI } from '@app/lib/svg'
import { IconCommonArrowDropDown } from '@app/assets/icons'

export function ConfigSelect(props: {
  className?: string
  options: string[]
  disables?: string[]
  value: string
  onChange(value: string): void
  placeholder?: string
}) {
  return (
    <select
      className={cx(
        css`
          width: 185px;
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          border-radius: 8px;
          outline: none;
          font-style: normal;
          font-weight: normal;
          font-size: 14px;
          padding: 9px 26px 9px 9px;
          appearance: none;
          background-repeat: no-repeat;
          background-position: calc(100% - 4px) 50%;
          cursor: pointer;
          text-overflow: ellipsis;
          display: block;
          padding-right: 30px;
        `,
        props.className
      )}
      style={{
        color: props.value ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[1],
        backgroundImage: SVG2DataURI(IconCommonArrowDropDown)
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
          {option}
        </option>
      ))}
    </select>
  )
}
