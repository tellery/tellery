import { css } from '@emotion/css'
import React, { useCallback } from 'react'

import {
  IconVisualizationLineStyleLinear,
  IconVisualizationLineStyleMonotone,
  IconVisualizationLineStyleStep,
  IconVisualizationLine,
  IconVisualizationBar,
  IconVisualizationArea,
  IconCommonMore
} from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { ComboShape, ComboStack, Config, Type } from '../types'
import { ConfigSelect } from './ConfigSelect'
import ConfigIconButton from './ConfigIconButton'
import { ConfigItem } from './ConfigItem'
import { ConfigPopover } from './ConfigPopover'

const lineTypes: Config<Type.COMBO>['groups'][0]['type'][] = ['linear', 'monotone', 'step']

export function MoreSettingPopover(props: {
  shapes: number
  value: Config<Type.COMBO>['groups'][0]
  onChange(value: Config<Type.COMBO>['groups'][0]): void
}) {
  const { onChange } = props
  const renderLineStyle = useCallback(() => {
    return (
      <ConfigItem label="Line style">
        <div
          className={css`
            display: flex;
            justify-content: flex-end;
          `}
        >
          {lineTypes.map((lineType) => (
            <ConfigIconButton
              key={lineType}
              icon={
                {
                  linear: IconVisualizationLineStyleLinear,
                  monotone: IconVisualizationLineStyleMonotone,
                  step: IconVisualizationLineStyleStep
                }[lineType]
              }
              color={ThemingVariables.colors.text[0]}
              onClick={() => {
                onChange({
                  ...props.value,
                  type: lineType
                })
              }}
              className={css`
                background-color: ${props.value.type === lineType ? ThemingVariables.colors.primary[4] : 'transparent'};
                cursor: ${props.value.type === lineType ? 'default' : 'pointer'};
              `}
            />
          ))}
        </div>
      </ConfigItem>
    )
  }, [onChange, props.value])
  const renderStack = useCallback(() => {
    return (
      <ConfigItem label="Stack mode">
        <ConfigSelect
          className={css`
            width: 96px;
          `}
          options={Object.values(ComboStack)}
          value={props.value.stackType}
          onChange={(value) => {
            onChange({
              ...props.value,
              stackType: value as ComboStack
            })
          }}
        />
      </ConfigItem>
    )
  }, [onChange, props.value])
  const renderConnectNulls = useCallback(() => {
    return (
      <ConfigItem label="Connect nulls">
        <ConfigSelect
          className={css`
            width: 96px;
            margin-left: calc(160px - 96px);
          `}
          options={['Connected', 'None']}
          value={props.value.connectNulls ? 'Connected' : 'None'}
          onChange={(value) => {
            onChange({
              ...props.value,
              connectNulls: value === 'Connected'
            })
          }}
        />
      </ConfigItem>
    )
  }, [onChange, props.value])

  return (
    <ConfigPopover
      title="Shape details"
      content={
        <>
          <ConfigItem label="Type">
            <div
              className={css`
                display: flex;
                justify-content: flex-end;
              `}
            >
              {Object.values(ComboShape).map((shape) => (
                <ConfigIconButton
                  key={shape}
                  icon={
                    {
                      [ComboShape.LINE]: IconVisualizationLine,
                      [ComboShape.BAR]: IconVisualizationBar,
                      [ComboShape.AREA]: IconVisualizationArea
                    }[shape]
                  }
                  color={ThemingVariables.colors.text[0]}
                  onClick={() => {
                    props.onChange({
                      ...props.value,
                      shape
                    })
                  }}
                  className={css`
                    background-color: ${props.value.shape === shape
                      ? ThemingVariables.colors.primary[4]
                      : 'transparent'};
                    cursor: ${props.value.shape === shape ? 'default' : 'pointer'};
                  `}
                />
              ))}
            </div>
          </ConfigItem>
          {props.value.shape === ComboShape.LINE ? (
            <>
              {renderLineStyle()}
              {renderConnectNulls()}
            </>
          ) : null}
          {props.value.shape === ComboShape.BAR ? renderStack() : null}
          {props.value.shape === ComboShape.AREA ? (
            <>
              {renderLineStyle()}
              {renderStack()}
              {renderConnectNulls()}
            </>
          ) : null}
        </>
      }
    >
      <ConfigIconButton icon={IconCommonMore} />
    </ConfigPopover>
  )
}
