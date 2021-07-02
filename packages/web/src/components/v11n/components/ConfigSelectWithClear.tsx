import { css } from '@emotion/css'

import { ThemingVariables } from 'styles'
import { SVG2DataURI } from 'lib/svg'
import { IconCommonArrowDropDown, IconCommonClose } from 'assets/icons'
import Icon from 'components/kit/Icon'

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
      className={css`
        width: 185px;
        border: 1px solid ${ThemingVariables.colors.gray[1]};
        border-radius: 8px;
        outline: none;
        padding-left: 9px;
        appearance: none;
        background-repeat: no-repeat;
        background-position: calc(100% - 4px) 50%;
        cursor: pointer;
        text-overflow: ellipsis;
        font-size: 14px;
        font-weight: 400;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `}
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
        `}
        style={{
          color: props.value ? ThemingVariables.colors.text[0] : ThemingVariables.colors.text[1],
          backgroundImage: SVG2DataURI(IconCommonArrowDropDown)
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
          height: 36px;
          width: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${ThemingVariables.colors.gray[2]};
        `}
        onClick={() => {
          props.onChange(undefined)
        }}
      >
        <Icon icon={IconCommonClose} color={ThemingVariables.colors.gray[0]} />
      </div>
    </div>
  )
}
