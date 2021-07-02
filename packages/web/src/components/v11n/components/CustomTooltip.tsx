import { css, cx } from '@emotion/css'
import type { ValueType } from '@tellery/recharts/types/component/DefaultTooltipContent'
import type { TooltipProps } from '@tellery/recharts/types/component/Tooltip'
import { IconCommonDot } from 'assets/icons'
import { ThemingVariables } from 'styles'
import { formatRecord } from '../utils'
import type { DisplayType } from '../types'
import Icon from 'components/kit/Icon'

export function CustomTooltip(
  props: TooltipProps<ValueType, string> & {
    displayTypes: { [name: string]: DisplayType }
    color?: string
    hide?: boolean
    hideDot?: boolean
    hideLabel?: boolean
    labelName?: string
  }
) {
  return props.hide ? null : (
    <div
      className={css`
        color: ${ThemingVariables.colors.text[0]};
        border-radius: 8px;
        border: none;
        box-shadow: ${ThemingVariables.boxShadows[0]};
        padding: 8px;
        background-color: ${ThemingVariables.colors.gray[5]};
        width: max-content;
      `}
    >
      {props.label !== undefined && !props.hideLabel ? (
        <span
          className={css`
            font-weight: 500;
          `}
        >
          {formatRecord(props.label, props.labelName ? props.displayTypes[props.labelName] : undefined)}
        </span>
      ) : null}
      {props.color && props.payload?.length ? (
        <span
          className={css`
            font-weight: 500;
          `}
        >
          {props.payload?.[0].payload?.[props.color as keyof typeof props.payload[0]]}
        </span>
      ) : null}
      {props.payload?.map((item) => {
        const [value, name, selected] = props.formatter?.(item.value, item.name === "value['']" ? '' : item.name) || [
          item.value,
          item.name === "value['']" ? '' : item.name
        ]
        if (value === null && name === null) {
          return null
        }
        return (
          <div
            key={name}
            className={cx(
              css`
                white-space: nowrap;
              `,
              selected
                ? undefined
                : css`
                    color: ${ThemingVariables.colors.text[1]};
                  `
            )}
          >
            {props.hideDot ? null : (
              <Icon
                icon={IconCommonDot}
                color={item.payload?.fill || item.color}
                className={css`
                  vertical-align: middle;
                  margin-left: -6px;
                  height: 22px;
                `}
              />
            )}
            {name}
            <span
              className={css`
                float: right;
                margin-left: 20px;
                white-space: nowrap;
              `}
            >
              {value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
