import { cx, css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'
import { ConfigColorPicker } from './ConfigColorPicker'
import { ConfigPopover } from './ConfigPopover'
import { ConfigSection } from './ConfigSection'
import { ConfigItem } from './ConfigItem'

export function SliceSelector(props: {
  className?: string
  value: { key: string; title: string; color: number }
  onChange(value: { key: string; title: string; color: number }): void
}) {
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
          border: 1px solid transparent;
          border-radius: 4px;
          :hover {
            border: 1px solid ${ThemingVariables.colors.primary[2]};
          }
        `
      )}
    >
      <ConfigPopover
        title="Slice detail"
        content={
          <ConfigSection>
            <ConfigItem label="Color" multiline={true}>
              <ConfigColorPicker
                value={props.value.color}
                onChange={(color) => {
                  props.onChange({
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
          props.onChange({
            ...props.value,
            title: e.target.value
          })
        }}
        placeholder={props.value.key}
      />
    </div>
  )
}
