import { cx, css } from '@emotion/css'
import type { Config, Type } from '../types'
import { ThemingVariables } from '@app/styles'
import FormSwitch from '@app/components/kit/FormSwitch'
import { ConfigPopover } from './ConfigPopover'
import { ConfigItem } from './ConfigItem'
import { ConfigColorPicker } from './ConfigColorPicker'

export function ShapeSelector(props: {
  className?: string
  value: Config<Type.COMBO>['shapes'][0]
  onChange(value: Config<Type.COMBO>['shapes'][0]): void
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
          padding-left: 6px;
          border: 1px solid transparent;
          border-radius: 4px;
          :hover {
            border: 1px solid ${ThemingVariables.colors.primary[2]};
          }
        `
      )}
    >
      <ConfigPopover
        title="Shape details"
        content={() => (
          <>
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
            <ConfigItem label="Trend line">
              <div
                className={css`
                  display: flex;
                  justify-content: flex-end;
                  line-height: 0;
                  padding-right: 6px;
                `}
              >
                <FormSwitch
                  checked={props.value.hasTrendline}
                  onChange={(e) => {
                    onChange({
                      ...props.value,
                      hasTrendline: e.target.checked
                    })
                  }}
                />
              </div>
            </ConfigItem>
          </>
        )}
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
      <input
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
        value={props.value.title}
        onChange={(e) => {
          onChange({
            ...props.value,
            title: e.target.value
          })
        }}
        placeholder={props.value.key}
      />
    </div>
  )
}
