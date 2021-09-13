import { css, cx } from '@emotion/css'

import { TelleryThemeLight, ThemingVariables } from '@app/styles'
import { SVG2DataURI } from '@app/lib/svg'
import { IconCommonArrowDropDown, IconCommonSub } from '@app/assets/icons'

export function ConfigSelectWithClear(props: {
  className?: string
  options: string[]
  disables?: string[]
  value?: string
  onChange(value?: string): void
  placeholder: string
}) {
  return (
    <div
      className={cx(
        css`
          height: 32px;
          width: 100%;
          border: 1px solid transparent;
          border-radius: 4px;
          outline: none;
          padding-left: 6px;
          appearance: none;
          background-repeat: no-repeat;
          background-position: calc(100% - 4px) 50%;
          cursor: pointer;
          text-overflow: ellipsis;
          font-size: 12px;
          font-weight: 400;
          display: flex;
          align-items: center;
          justify-content: space-between;
          :focus,
          :active,
          :hover {
            border: 1px solid ${ThemingVariables.colors.primary[2]};
          }
        `,
        props.className
      )}
    >
      <select
        className={css`
          appearance: none;
          border: none;
          outline: none;
          cursor: pointer;
          background-repeat: no-repeat;
          background-position: calc(100% - 7px) 50%;
          flex: 1;
          text-overflow: ellipsis;
          display: block;
          width: 100%;
          padding-right: 30px;
          color: ${props.value ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[2]};
        `}
        style={{
          backgroundImage: SVG2DataURI(IconCommonArrowDropDown, TelleryThemeLight.colors.text[0])
        }}
        value={props.value || ''}
        onChange={(e) => {
          props.onChange(e.target.value)
        }}
      >
        <option value="" disabled={true}>
          {props.placeholder}
        </option>
        {props.options.map((option) => (
          <option key={option} value={option} disabled={props.disables?.includes(option)}>
            {option}
          </option>
        ))}
      </select>
      <div
        className={css`
          cursor: pointer;
          height: 32px;
          width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        `}
        onClick={() => {
          props.onChange(undefined)
        }}
      >
        <IconCommonSub color={ThemingVariables.colors.text[0]} />
      </div>
    </div>
  )
}
