import { cx, css } from '@emotion/css'
import React, { CSSProperties, ReactNode, useCallback, useRef, useState } from 'react'

import {
  IconVisualizationLineStyleLinear,
  IconVisualizationLineStyleMonotone,
  IconVisualizationLineStyleStep,
  IconVisualizationLine,
  IconVisualizationBar,
  IconVisualizationArea
} from 'assets/icons'
import { BlockPopover } from 'components/BlockPopover'
import { ThemingVariables } from 'styles'
import { ComboShape, ComboStack, Config, Type } from '../types'
import { ConfigSelect } from './ConfigSelect'
import { ConfigSwitch } from './ConfigSwitch'
import Icon from 'components/kit/Icon'

const lineTypes: Config<Type.COMBO>['groups'][0]['type'][] = ['linear', 'monotone', 'step']

export function MoreSettingPopover(props: {
  shapes: number
  value: Config<Type.COMBO>['groups'][0]
  onChange(value: Config<Type.COMBO>['groups'][0]): void
}) {
  const { onChange } = props
  const renderLineStyle = useCallback(() => {
    return (
      <>
        <Label
          className={css`
            margin: 15px 0 8px 0;
          `}
        >
          Line style
        </Label>
        <div
          className={css`
            margin: -2.5px;
            display: flex;
            flex-wrap: wrap;
          `}
        >
          {lineTypes.map((lineType) => (
            <Button
              key={lineType}
              onClick={() => {
                onChange({
                  ...props.value,
                  type: lineType
                })
              }}
              style={{
                backgroundColor:
                  props.value.type === lineType
                    ? ThemingVariables.colors.primary[1]
                    : ThemingVariables.colors.primary[3],
                cursor: props.value.type === lineType ? 'default' : 'pointer'
              }}
            >
              {
                {
                  linear: (
                    <Icon
                      icon={IconVisualizationLineStyleLinear}
                      color={
                        props.value.type === lineType
                          ? ThemingVariables.colors.gray[5]
                          : ThemingVariables.colors.primary[1]
                      }
                    />
                  ),
                  monotone: (
                    <Icon
                      icon={IconVisualizationLineStyleMonotone}
                      color={
                        props.value.type === lineType
                          ? ThemingVariables.colors.gray[5]
                          : ThemingVariables.colors.primary[1]
                      }
                    />
                  ),
                  step: (
                    <Icon
                      icon={IconVisualizationLineStyleStep}
                      color={
                        props.value.type === lineType
                          ? ThemingVariables.colors.gray[5]
                          : ThemingVariables.colors.primary[1]
                      }
                    />
                  )
                }[lineType]
              }
            </Button>
          ))}
        </div>
      </>
    )
  }, [onChange, props.value])
  const renderStack = useCallback(() => {
    return (
      <>
        <Label
          className={css`
            margin: 15px 0 8px 0;
          `}
        >
          Stack mode
        </Label>
        <ConfigSelect
          className={css`
            width: 100%;
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
      </>
    )
  }, [onChange, props.value])
  const renderConnectNulls = useCallback(() => {
    return (
      <>
        <Label
          className={css`
            margin: 15px 0 8px 0;
          `}
        >
          Connect nulls
        </Label>
        <ConfigSwitch
          value={props.value.connectNulls}
          onChange={(value) => {
            onChange({
              ...props.value,
              connectNulls: value
            })
          }}
        />
      </>
    )
  }, [onChange, props.value])
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <BlockPopover placement="left" open={open} setOpen={setOpen} referenceElement={ref.current}>
        <div
          className={css`
            padding: 5px 20px 20px 20px;
            width: 158px;
            background: ${ThemingVariables.colors.gray[5]};
            box-shadow: ${ThemingVariables.boxShadows[0]};
            border-radius: 8px;
          `}
        >
          <Label
            className={css`
              margin: 15px 0 8px 0;
            `}
          >
            Type
          </Label>
          <div
            className={css`
              margin: -2.5px;
              display: flex;
              flex-wrap: wrap;
            `}
          >
            {Object.values(ComboShape).map((shape) => (
              <Button
                key={shape}
                onClick={() => {
                  props.onChange({
                    ...props.value,
                    shape
                  })
                }}
                style={{
                  backgroundColor:
                    props.value.shape === shape
                      ? ThemingVariables.colors.primary[1]
                      : ThemingVariables.colors.primary[3],
                  cursor: props.value.shape === shape ? 'default' : 'pointer'
                }}
              >
                {
                  {
                    [ComboShape.LINE]: (
                      <Icon
                        icon={IconVisualizationLine}
                        color={
                          props.value.shape === shape
                            ? ThemingVariables.colors.gray[5]
                            : ThemingVariables.colors.primary[1]
                        }
                      />
                    ),
                    [ComboShape.BAR]: (
                      <Icon
                        icon={IconVisualizationBar}
                        color={
                          props.value.shape === shape
                            ? ThemingVariables.colors.gray[5]
                            : ThemingVariables.colors.primary[1]
                        }
                      />
                    ),
                    [ComboShape.AREA]: (
                      <Icon
                        icon={IconVisualizationArea}
                        color={
                          props.value.shape === shape
                            ? ThemingVariables.colors.gray[5]
                            : ThemingVariables.colors.primary[1]
                        }
                      />
                    )
                  }[shape]
                }
              </Button>
            ))}
          </div>
          {props.value.shape === ComboShape.LINE ? (
            <div>
              {renderLineStyle()}
              {renderConnectNulls()}
            </div>
          ) : null}
          {props.value.shape === ComboShape.BAR ? <div>{renderStack()}</div> : null}
          {props.value.shape === ComboShape.AREA ? (
            <div>
              {renderLineStyle()}
              {renderStack()}
              {renderConnectNulls()}
            </div>
          ) : null}
        </div>
      </BlockPopover>
      <span
        ref={ref}
        className={css`
          color: ${ThemingVariables.colors.primary[1]};
          cursor: pointer;
        `}
        onClick={() => {
          setOpen(true)
        }}
      >
        more setting
      </span>
    </>
  )
}

function Button(props: { style?: CSSProperties; onClick: () => void; children?: ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      className={css`
        appearance: none;
        border: none;
        outline: none;
        width: 36px;
        height: 36px;
        border-radius: 6px;
        margin: 2.5px;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
      style={props.style}
    >
      {props.children}
    </button>
  )
}

function Label(props: { className?: string; children: ReactNode }) {
  return (
    <h5
      className={cx(
        props.className,
        css`
          font-style: normal;
          font-weight: 500;
          font-size: 12px;
          line-height: 15px;
          color: ${ThemingVariables.colors.text[1]};
        `
      )}
    >
      {props.children}
    </h5>
  )
}
