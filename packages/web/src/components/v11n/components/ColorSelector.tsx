import { cx, css } from '@emotion/css'
import type { Config, Type } from '../types'
import { ThemingVariables } from '@app/styles'
import { ConfigPopover } from './ConfigPopover'
import { ConfigSection } from './ConfigSection'
import { ConfigItem } from './ConfigItem'
import { ConfigColorPicker } from './ConfigColorPicker'

export function ColorSelector(props: {
  className?: string
  value: Config<Type.SCATTER>['colors'][0]
  onChange(value: Config<Type.SCATTER>['colors'][0]): void
}) {
  const { onChange } = props

  return (
    <div
      className={cx(
        props.className,
        css`
          overflow: hidden;
          display: inline-flex;
          align-items: center;
          height: 32px;
          width: 100%;
        `
      )}
    >
      <ConfigPopover
        title="Color detail"
        content={
          <ConfigSection>
            <ConfigItem label="Color" multiline={true}>
              <ConfigColorPicker
                value={props.value.color}
                onChange={(color) => {
                  onChange({
                    ...props.value,
                    color
                  })
                }}
              />
            </ConfigItem>
          </ConfigSection>
        }
      >
        <div
          className={css`
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            cursor: pointer;
            background-color: ${ThemingVariables.colors.visualization[props.value.color] ||
            ThemingVariables.colors.visualizationOther};
          `}
        />
      </ConfigPopover>
      <span
        className={css`
          margin-left: 10px;
          flex: 1;
          width: 0;
          font-size: 12px;
          line-height: 14px;
          appearance: none;
          outline: none;
          border: none;
          font-weight: normal;
          text-overflow: ellipsis;
          background-color: transparent;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        {props.value.key}
      </span>
    </div>
  )
}
