import { css, cx } from '@emotion/css'
import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState, MouseEvent } from 'react'
import { sortBy, keyBy, compact, upperFirst, sum, mapValues, tail, head } from 'lodash'
import { useTextWidth } from '@imagemarker/use-text-width'
import { nanoid } from 'nanoid'
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from '@tellery/recharts'
import type { Path } from 'd3-path'
import type { CurveGenerator } from 'd3-shape'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { ComboShape, ComboStack, Config, DisplayType, Type } from '../types'
import type { Chart } from './base'
import { ConfigLabel } from '../components/ConfigLabel'
import { SortableList } from '../components/SortableList'
import { ConfigNumericInput } from '../components/ConfigNumericInput'
import { ConfigButton } from '../components/ConfigButton'
import { ShapeSelector } from '../components/ShapeSelector'
import { ConfigInput } from '../components/ConfigInput'
import { ConfigSelect } from '../components/ConfigSelect'
import { LegendContent } from '../components/LegendContent'
import { fontFamily } from '../constants'
import { createTrend, formatNumber, formatRecord, isContinuous, isNumeric } from '../utils'
import { MoreSettingPopover } from '../components/MoreSettingPopover'
import { ThemingVariables } from '@app/styles'
import { SVG2DataURI } from '@app/lib/svg'
import { IconCommonArrowDropDown, IconCommonClose, IconCommonAdd } from '@app/assets/icons'
import { CustomTooltip } from '../components/CustomTooltip'
import { useCrossFilter, useDataRecords } from '@app/hooks/useDataRecords'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'
import Icon from '@app/components/kit/Icon'

const splitter = ', '

enum Tab {
  DATA = 'Data',
  DISPLAY = 'Display',
  AXIS = 'Axis'
}

const numberformat = new Intl.NumberFormat([], { maximumFractionDigits: 2 })

const scaleTypes = ['auto', 'linear', 'pow', 'sqrt', 'log']

function mapAxis2Label(axise: 'xAxises' | 'yAxises' | 'y2Axises') {
  return { xAxises: 'xLabel', yAxises: 'yLabel', y2Axises: 'y2Label' }[axise] as 'xLabel' | 'yLabel' | 'y2Label'
}

function calcLabel(array: string[], axise: 'xAxises' | 'yAxises' | 'y2Axises') {
  return array.length === 1 || axise === 'xAxises' ? array[0] : ''
}

function calcYAxisId(groupId: string) {
  return ['left', 'right'].includes(groupId) ? groupId : 'left'
}

function valueKey(key?: string) {
  return `value['${key}']`
}

export const combo: Chart<Type.COMBO | Type.LINE | Type.BAR | Type.AREA> = {
  type: Type.COMBO,

  initializeConfig(data, cache) {
    if (cache[Type.COMBO]) {
      return cache[Type.COMBO]!
    }
    // pick a number column as Y axis
    const y = data.fields.find(
      ({ displayType }) =>
        isNumeric(displayType) && displayType !== DisplayType.TIME && displayType !== DisplayType.DATE
    )
    const x =
      // first, try use a time column as X axis
      data.fields.find(
        ({ name, displayType }) =>
          // X and Y axis can't be the same
          name !== y?.name &&
          (displayType === DisplayType.TIME ||
            displayType === DisplayType.DATE ||
            name === 'dt' ||
            name === 'date' ||
            name === 'ts')
      ) ||
      // then, select numeric data as the X axis
      data.fields.find(({ name, displayType }) => name !== y?.name && isNumeric(displayType)) ||
      // last, pick string type column as the X axis
      data.fields.find(({ name, displayType }) => name !== y?.name && displayType === DisplayType.STRING)
    return {
      type: Type.COMBO,
      axises: data.fields.map(({ name }) => name),

      xAxises: x ? [x.name] : [],
      dimensions: [],
      yAxises: y ? [y.name] : [],
      y2Axises: [],

      groups: [],
      shapes: [],
      referenceYLabel: '',
      referenceYValue: undefined,
      referenceYAxis: 'left',

      xLabel: x?.name || '',
      yLabel: y?.name || '',
      yScale: 'auto',
      yRangeMin: 0,
      yRangeMax: undefined,
      y2Label: '',
      y2Scale: 'auto',
      y2RangeMin: 0,
      y2RangeMax: undefined
    }
  },

  Configuration(props) {
    const { yAxises, y2Axises } = props.config
    const dimensions = props.config.dimensions || tail(props.config.xAxises)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const xAxises = props.config.dimensions ? props.config.xAxises : [head(props.config.xAxises)!]
    const { onConfigChange } = props
    const [tab, setTab] = useState<Tab>(Tab.DATA)
    const axises = useMemo(
      () => ({
        xAxises,
        dimensions,
        yAxises,
        y2Axises
      }),
      [xAxises, dimensions, y2Axises, yAxises]
    )
    const filter = useCrossFilter(props.data)
    const shapes = useMemo<{ key: string; groupId: 'left' | 'right' }[]>(() => {
      const combinedYAxises = [...yAxises, ...y2Axises]
      return dimensions.length
        ? filter
            .dimension((v) => dimensions.map((dimention) => v[dimention] as string | number))
            .group()
            .all()
            .reduce<{ key: string; groupId: 'left' | 'right' }[]>((array, { key }) => {
              yAxises.forEach((y) => {
                array.push({
                  key:
                    combinedYAxises.length > 1
                      ? `${Array.isArray(key) ? key.join(splitter) : key}${splitter}${y}`
                      : String(Array.isArray(key) ? key.join(splitter) : key),
                  groupId: 'left' as 'left'
                })
              })
              y2Axises.forEach((y) => {
                array.push({
                  key:
                    combinedYAxises.length > 1
                      ? `${Array.isArray(key) ? key.join(splitter) : key}${splitter}${y}`
                      : String(Array.isArray(key) ? key.join(splitter) : key),
                  groupId: 'right' as 'right'
                })
              })
              return array
            }, [])
        : [
            ...yAxises.map((key) => ({ key, groupId: 'left' as 'left' })),
            ...y2Axises.map((key) => ({ key, groupId: 'right' as 'right' }))
          ]
    }, [filter, dimensions, yAxises, y2Axises])
    useEffect(() => {
      const groups = compact([
        yAxises.length ? { key: 'left' } : undefined,
        y2Axises.length ? { key: 'right' } : undefined
      ])
      if (props.config.groups.map(({ key }) => key).join() === groups.map(({ key }) => key).join()) {
        return
      }
      onConfigChange(
        'groups',
        groups.map(
          (group) =>
            props.config.groups.find((g) => g.key === group.key) || {
              key: group.key,
              type: 'linear',
              shape: {
                [Type.COMBO]: ComboShape.LINE,
                [Type.AREA]: ComboShape.AREA,
                [Type.BAR]: ComboShape.BAR,
                [Type.LINE]: ComboShape.LINE
              }[props.config.type],
              stackType: ComboStack.NONE,
              connectNulls: true
            }
        ) as Config<Type.COMBO>['groups']
      )
    }, [yAxises, y2Axises, props.config.type, onConfigChange, props.config.groups])
    useEffect(() => {
      if (
        sortBy(props.config.shapes, 'key')
          .map(({ key, groupId }) => key + groupId)
          .join() ===
        sortBy(shapes, 'key')
          .map(({ key, groupId }) => key + groupId)
          .join()
      ) {
        return
      }
      onConfigChange(
        'shapes',
        shapes
          .map(
            (shape) =>
              props.config.shapes.find((s) => s.key === shape.key && s.groupId === shape.groupId) || {
                key: shape.key,
                groupId: shape.groupId,
                title: shape.key,
                hasTrendline: false
              }
          )
          .map((shape, index) => ({
            ...shape,
            color: index % ThemingVariables.colors.visualization.length
          })) as Config<Type.COMBO>['shapes']
      )
    }, [onConfigChange, shapes, props.config.shapes])
    const renderAxisSelect = useCallback(
      (title: string, axise: 'xAxises' | 'dimensions' | 'yAxises' | 'y2Axises', disabled: boolean, first?: boolean) => {
        return (
          <>
            <ConfigLabel top={first ? 0 : undefined}>{title}</ConfigLabel>
            <SortableList
              className={css`
                margin: -5px;
              `}
              value={axises[axise]}
              onChange={(value) => {
                if (axise === 'dimensions') {
                  onConfigChange(axise, value)
                } else {
                  onConfigChange(axise, value, mapAxis2Label(axise), calcLabel(value, axise))
                }
              }}
              renderItem={(item) => (
                <div
                  className={css`
                    flex: 1;
                    width: 0;
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
                      backgroundImage: SVG2DataURI(IconCommonArrowDropDown)
                    }}
                    value={item}
                    onChange={(e) => {
                      const array = axises[axise].map((axis) => (axis === item ? e.target.value : axis))
                      if (axise === 'dimensions') {
                        onConfigChange(axise, array)
                      } else {
                        onConfigChange(axise, array, mapAxis2Label(axise), calcLabel(array, axise))
                      }
                    }}
                  >
                    {props.config.axises.map((axis) => (
                      <option key={axis} value={axis}>
                        {axis}
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
                      const array = axises[axise].filter((axis) => axis !== item)
                      if (axise === 'dimensions') {
                        onConfigChange(axise, array)
                      } else {
                        onConfigChange(axise, array, mapAxis2Label(axise), calcLabel(array, axise))
                      }
                    }}
                  >
                    <Icon icon={IconCommonClose} color={ThemingVariables.colors.gray[0]} />
                  </div>
                </div>
              )}
              footer={
                <AxisSelect
                  className={css`
                    margin: 5px;
                  `}
                  options={props.config.axises}
                  disabled={disabled}
                  onSelect={(value) => {
                    const array = [...axises[axise], value]
                    if (axise === 'dimensions') {
                      onConfigChange(axise, array)
                    } else {
                      onConfigChange(axise, array, mapAxis2Label(axise), calcLabel(array, axise))
                    }
                  }}
                />
              }
            />
          </>
        )
      },
      [onConfigChange, props.config.axises, axises]
    )

    return (
      <div
        className={css`
          display: flex;
          height: 100%;
          width: calc(150px + 225px);
        `}
      >
        <div
          className={css`
            height: 100%;
            flex-shrink: 0;
            padding: 5px;
            box-shadow: 1px 0px 0px ${ThemingVariables.colors.gray[1]};
          `}
        >
          {Object.values(Tab).map((t) => (
            <ConfigButton
              key={t}
              className={css`
                width: 120px;

                &:hover {
                  background: ${ThemingVariables.colors.primary[4]};
                }
              `}
              active={tab === t}
              onClick={() => {
                setTab(t)
              }}
            >
              {t}
            </ConfigButton>
          ))}
        </div>
        <PerfectScrollbar
          className={css`
            padding: 20px;
            flex: 1;
          `}
          options={{ suppressScrollX: true }}
        >
          {tab === Tab.DATA ? (
            <>
              {renderAxisSelect('X axis', 'xAxises', false, true)}
              {renderAxisSelect('Dimension', 'dimensions', yAxises.length > 0 && y2Axises.length > 0)}
              {renderAxisSelect(
                'Y axis (Left)',
                'yAxises',
                dimensions.length > 0 && (yAxises.length > 0 || y2Axises.length > 0)
              )}
              {renderAxisSelect(
                'Y axis (Right)',
                'y2Axises',
                dimensions.length > 0 && (yAxises.length > 0 || y2Axises.length > 0)
              )}
            </>
          ) : null}
          {tab === Tab.DISPLAY ? (
            <>
              <ConfigLabel top={0}>Shapes</ConfigLabel>
              {props.config.groups.map((item) => (
                <div
                  key={item.key}
                  className={css`
                    margin-bottom: 20px;
                  `}
                >
                  <div
                    className={css`
                      display: flex;
                      align-items: center;
                      justify-content: space-between;
                      font-size: 12px;
                      margin-bottom: 5px;
                    `}
                  >
                    <span
                      className={css`
                        color: ${ThemingVariables.colors.text[1]};
                      `}
                    >
                      Y axis ({upperFirst(item.key)})
                    </span>
                    <MoreSettingPopover
                      shapes={props.config.shapes.filter(({ groupId }) => groupId === item.key).length}
                      value={item}
                      onChange={(value) => {
                        onConfigChange(
                          'groups',
                          props.config.groups.map((group) => (group.key === item.key ? { ...item, ...value } : group))
                        )
                      }}
                    />
                  </div>
                  <SortableList
                    value={props.config.shapes.filter(({ groupId }) => groupId === item.key)}
                    onChange={(value) => {
                      onConfigChange('shapes', value)
                    }}
                    renderItem={(item) => (
                      <ShapeSelector
                        key={item.key}
                        value={item}
                        onChange={(value) => {
                          onConfigChange(
                            'shapes',
                            props.config.shapes.map((shape) => (shape.key === item.key ? { ...item, ...value } : shape))
                          )
                        }}
                      />
                    )}
                    className={css`
                      margin: -5px;
                    `}
                  />
                </div>
              ))}

              {props.config.shapes.length === 0 ? (
                <span
                  className={css`
                    margin-top: 10px;
                    font-size: 14px;
                    font-weight: 400;
                    opacity: 0.3;
                    cursor: pointer;

                    &:hover {
                      text-decoration: underline;
                    }
                  `}
                  onClick={() => {
                    setTab(Tab.DATA)
                  }}
                >
                  No shapes. Click to configure data
                </span>
              ) : null}
              <ConfigLabel>Y reference line</ConfigLabel>
              <div
                className={css`
                  margin: -5px;
                `}
              >
                <AxisFormItem label="Label">
                  <ConfigInput
                    value={props.config.referenceYLabel}
                    onChange={(value) => {
                      onConfigChange('referenceYLabel', value)
                    }}
                  />
                </AxisFormItem>
                <AxisFormItem label="Value">
                  <ConfigNumericInput
                    value={props.config.referenceYValue}
                    onChange={(value) => {
                      onConfigChange('referenceYValue', value)
                    }}
                  />
                </AxisFormItem>
                {props.config.yAxises.length && props.config.y2Axises.length ? (
                  <AxisFormItem label="Y axis">
                    <ConfigSelect
                      options={['left', 'right']}
                      value={props.config.referenceYAxis}
                      onChange={(value) => {
                        onConfigChange('referenceYAxis', value)
                      }}
                    />
                  </AxisFormItem>
                ) : null}
              </div>
            </>
          ) : null}
          {tab === Tab.AXIS ? (
            <>
              <ConfigLabel top={0}>X axis</ConfigLabel>
              <div
                className={css`
                  margin: -5px;
                `}
              >
                <AxisFormItem label="Label">
                  <ConfigInput
                    value={props.config.xLabel}
                    onChange={(value) => {
                      onConfigChange('xLabel', value)
                    }}
                  />
                </AxisFormItem>
              </div>
              <ConfigLabel>Y axis (Left)</ConfigLabel>
              <div
                className={css`
                  margin: -5px;
                `}
              >
                <AxisFormItem label="Label">
                  <ConfigInput
                    value={props.config.yLabel}
                    onChange={(value) => {
                      onConfigChange('yLabel', value)
                    }}
                  />
                </AxisFormItem>
                <AxisFormItem label="Scale">
                  <ConfigSelect
                    options={scaleTypes}
                    value={props.config.yScale}
                    onChange={(value) => {
                      onConfigChange('yScale', value, 'yRangeMin', value === 'log' ? undefined : 0)
                    }}
                  />
                </AxisFormItem>
                <AxisFormItem label="Range">
                  <div
                    className={css`
                      display: flex;
                      align-items: center;
                      width: 185px;
                    `}
                  >
                    <ConfigNumericInput
                      className={css`
                        width: 0;
                        flex: 1;
                      `}
                      placeholder="min"
                      value={props.config.yRangeMin}
                      onChange={(value) => {
                        onConfigChange('yRangeMin', value)
                      }}
                    />
                    <div
                      className={css`
                        width: 8px;
                        height: 0px;
                        border-top: 1px solid ${ThemingVariables.colors.gray[1]};
                        margin: 0 8px;
                        flex-shrink: 0;
                      `}
                    />
                    <ConfigNumericInput
                      className={css`
                        width: 0;
                        flex: 1;
                      `}
                      placeholder="max"
                      value={props.config.yRangeMax}
                      onChange={(value) => {
                        onConfigChange('yRangeMax', value)
                      }}
                    />
                  </div>
                </AxisFormItem>
              </div>
              {props.config.y2Axises.length ? (
                <div
                  className={css`
                    margin: -5px;
                  `}
                >
                  <ConfigLabel>Y axis (Right)</ConfigLabel>
                  <AxisFormItem label="Label">
                    <ConfigInput
                      value={props.config.y2Label}
                      onChange={(value) => {
                        onConfigChange('y2Label', value)
                      }}
                    />
                  </AxisFormItem>
                  <AxisFormItem label="Scale">
                    <ConfigSelect
                      options={scaleTypes}
                      value={props.config.y2Scale}
                      onChange={(value) => {
                        onConfigChange('y2Scale', value, 'y2RangeMin', value === 'log' ? undefined : 0)
                      }}
                    />
                  </AxisFormItem>
                  <AxisFormItem label="Range">
                    <div
                      className={css`
                        display: flex;
                        align-items: center;
                        width: 185px;
                      `}
                    >
                      <ConfigNumericInput
                        className={css`
                          width: 0;
                          flex: 1;
                        `}
                        placeholder="min"
                        value={props.config.y2RangeMin}
                        onChange={(value) => {
                          onConfigChange('y2RangeMin', value)
                        }}
                      />
                      <div
                        className={css`
                          width: 8px;
                          height: 0px;
                          border-top: 1px solid ${ThemingVariables.colors.gray[1]};
                          margin: 0 8px;
                          flex-shrink: 0;
                        `}
                      />
                      <ConfigNumericInput
                        className={css`
                          width: 0;
                          flex: 1;
                        `}
                        placeholder="max"
                        value={props.config.y2RangeMax}
                        onChange={(value) => {
                          onConfigChange('y2RangeMax', value)
                        }}
                      />
                    </div>
                  </AxisFormItem>
                </div>
              ) : null}
            </>
          ) : null}
        </PerfectScrollbar>
      </div>
    )
  },

  Diagram(props) {
    const { yAxises, y2Axises } = props.config
    const dimensions = props.config.dimensions
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const xAxises = props.config.xAxises
    const records = useDataRecords(props.data)
    const filter = useCrossFilter(props.data)
    const displayTypes = useDataFieldsDisplayType(props.data.fields)
    const result = useMemo(() => {
      const combinedYAxises = [...yAxises, ...y2Axises]
      return dimensions.length
        ? filter
            .dimension((v) =>
              xAxises.length === 1
                ? (v[xAxises[0]] as string | number)
                : xAxises.map((x) => formatRecord(v[x], displayTypes[x], true)).join(splitter)
            )
            .group<string | number, { [key: string]: unknown }>()
            .reduce(
              (p, v) => {
                combinedYAxises.forEach((y) => {
                  dimensions.forEach(() => {
                    p[
                      combinedYAxises.length > 1
                        ? `${dimensions.map((dimension) => v[dimension]).join(splitter)}${splitter}${y}`
                        : dimensions.map((dimension) => v[dimension]).join(splitter)
                    ] = v[y]
                  })
                })
                return p
              },
              (p, v) => {
                combinedYAxises.forEach((y) => {
                  dimensions.forEach(() => {
                    delete p[
                      combinedYAxises.length > 1
                        ? `${dimensions.map((dimension) => v[dimension]).join(splitter)}${splitter}${y}`
                        : dimensions.map((dimension) => v[dimension]).join(splitter)
                    ]
                  })
                })
                return p
              },
              () => ({})
            )
            .all()
        : records.map((v) => ({
            key:
              xAxises.length === 1
                ? (v[xAxises[0]] as string | number)
                : xAxises.map((x) => formatRecord(v[x], displayTypes[x], true)).join(splitter),
            value: combinedYAxises.reduce<{ [key: string]: unknown }>((p, y) => {
              p[y] = v[y]
              return p
            }, {})
          }))
    }, [yAxises, y2Axises, dimensions, filter, records, xAxises, displayTypes])
    // convert result to support stack 100%
    const result100 = useMemo(() => {
      return result.map((item) => {
        const leftSum =
          props.config.groups.find((group) => group.key === 'left')?.stackType === ComboStack.STACK_100
            ? sum(props.config.shapes.filter((shape) => shape.groupId === 'left').map((shape) => item.value[shape.key]))
            : 1
        const rightSum =
          props.config.groups.find((group) => group.key === 'right')?.stackType === ComboStack.STACK_100
            ? sum(
                props.config.shapes.filter((shape) => shape.groupId === 'right').map((shape) => item.value[shape.key])
              )
            : 1
        return {
          key: item.key,
          value: mapValues(item.value, (value, key) =>
            typeof value === 'number'
              ? value /
                {
                  left: leftSum,
                  right: rightSum
                }[props.config.shapes.find((shape) => shape.key === key)?.groupId!]
              : value
          )
        }
      })
    }, [result, props.config.shapes, props.config.groups])
    const [hoverDataKey, setHoverDataKey] = useState<string>()
    const handleMouseLeave = useCallback(() => {
      setHoverDataKey(undefined)
    }, [])
    const titleMap = useMemo(
      () =>
        props.config.shapes.reduce<{ [key: string]: string }>((obj, { key, title }) => {
          obj[key] = title
          return obj
        }, {}),
      [props.config]
    )
    const trendSuffix = useMemo(() => nanoid(), [])
    const yLabelOffset = useTextWidth({ text: props.config.yLabel, font: `14px ${fontFamily}` }) / 2
    const y2LabelOffset = useTextWidth({ text: props.config.y2Label, font: `14px ${fontFamily}` }) / 2
    const groups = useMemo<{
      left?: typeof props.config.groups[0]
      right?: typeof props.config.groups[0]
    }>(() => keyBy(props.config.groups, 'key'), [props.config.groups])
    const trendline = useCallback((context: CanvasRenderingContext2D | Path) => {
      class TrendlineGenerator implements CurveGenerator {
        _context: CanvasRenderingContext2D | Path

        _points!: { x: number; y: number }[]

        constructor(context: CanvasRenderingContext2D | Path) {
          this._context = context
        }

        areaStart() {}

        areaEnd() {}

        lineStart() {
          this._points = []
        }

        lineEnd() {
          const { calcY } = createTrend(this._points, 'x', 'y')
          const start = this._points[0].x
          const end = this._points[this._points.length - 1].x
          this._context.moveTo(start, calcY(start))
          this._context.lineTo(end, calcY(end))
        }

        point(x: number, y: number) {
          this._points.push({ x, y })
        }
      }

      return new TrendlineGenerator(context)
    }, [])
    const isSmall = props.dimensions.height <= 180 && props.dimensions.width <= 380
    const showXLabel = props.config.xLabel && !isSmall
    const showYLabel = props.config.yLabel && !isSmall
    const showY2Label = props.config.y2Label && !isSmall
    const xDisplayType = useMemo(
      () => (props.config.xAxises.length === 1 ? displayTypes[props.config.xAxises[0]] : undefined),
      [displayTypes, props.config.xAxises]
    )

    return (
      <ResponsiveContainer>
        <ComposedChart
          width={props.dimensions.width}
          height={props.dimensions.height}
          data={result100 as unknown[]}
          className={css`
            font-size: 14px;

            svg path {
              transition: opacity 0.2s;
            }

            svg {
              overflow: visible;
            }
          `}
          margin={{
            top: 0,
            bottom: showXLabel ? 10 : -10,
            left: !props.config.yAxises.length || showYLabel ? 2 : -20,
            right: !props.config.y2Axises.length || showY2Label ? 2 : -20
          }}
        >
          {props.config.xAxises.length && (props.config.yAxises.length || props.config.y2Axises.length) ? (
            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={ThemingVariables.colors.gray[1]} />
          ) : null}
          <XAxis
            dataKey="key"
            label={
              showXLabel
                ? {
                    value: props.config.xLabel,
                    position: 'insideBottom',
                    offset: -8,
                    color: ThemingVariables.colors.text[0]
                  }
                : undefined
            }
            stroke={ThemingVariables.colors.text[1]}
            tickFormatter={(tick) => formatRecord(tick, xDisplayType)}
            padding={isContinuous(xDisplayType) ? { right: 16, left: 16 } : undefined}
            type={isContinuous(xDisplayType) ? 'number' : 'category'}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis
            yAxisId="left"
            hide={props.config.yAxises.length === 0}
            allowDuplicatedCategory={true}
            label={
              showYLabel
                ? {
                    value: props.config.yLabel,
                    position: 'insideLeft',
                    angle: -90,
                    dy: yLabelOffset,
                    color: ThemingVariables.colors.text[0]
                  }
                : undefined
            }
            orientation="left"
            tickFormatter={
              groups.left?.stackType === ComboStack.STACK_100 ? (tick) => `${Math.round(tick * 100)}%` : formatNumber
            }
            stroke={ThemingVariables.colors.text[1]}
            scale={props.config.yScale}
            domain={[
              groups.left?.stackType === ComboStack.STACK_100
                ? 0
                : props.config.yRangeMin === undefined || isNaN(props.config.yRangeMin)
                ? 'auto'
                : props.config.yRangeMin,
              groups.left?.stackType === ComboStack.STACK_100
                ? 1
                : props.config.yRangeMax === undefined || isNaN(props.config.yRangeMax)
                ? 'auto'
                : props.config.yRangeMax
            ]}
          />
          <YAxis
            yAxisId="right"
            hide={props.config.y2Axises.length === 0}
            allowDuplicatedCategory={true}
            label={
              showY2Label
                ? {
                    value: props.config.y2Label,
                    position: 'insideRight',
                    angle: 90,
                    dy: y2LabelOffset,
                    color: ThemingVariables.colors.text[0]
                  }
                : undefined
            }
            orientation="right"
            tickFormatter={
              groups.right?.stackType === ComboStack.STACK_100 ? (tick) => `${Math.round(tick * 100)}%` : formatNumber
            }
            stroke={ThemingVariables.colors.text[1]}
            scale={props.config.y2Scale}
            domain={[
              groups.right?.stackType === ComboStack.STACK_100
                ? 0
                : props.config.y2RangeMin === undefined || isNaN(props.config.y2RangeMin)
                ? 'auto'
                : props.config.y2RangeMin,
              groups.right?.stackType === ComboStack.STACK_100
                ? 1
                : props.config.y2RangeMax === undefined || isNaN(props.config.y2RangeMax)
                ? 'auto'
                : props.config.y2RangeMax
            ]}
          />
          <Tooltip
            cursor={false}
            wrapperStyle={{ zIndex: 9999999 }}
            isAnimationActive={false}
            content={
              <CustomTooltip
                displayTypes={displayTypes}
                labelName={props.config.xAxises.length === 1 ? props.config.xAxises[0] : undefined}
                hide={hoverDataKey === undefined}
                formatter={(value: unknown, name: string) =>
                  name.endsWith(trendSuffix)
                    ? [null, null]
                    : [
                        (groups.left?.stackType === ComboStack.STACK_100 &&
                          props.config.shapes.find((shape) => shape.key === name)?.groupId === 'left') ||
                        (groups.right?.stackType === ComboStack.STACK_100 &&
                          props.config.shapes.find((shape) => shape.key === name)?.groupId === 'right')
                          ? `${numberformat.format((value as number) * 100)}%`
                          : formatRecord(value, DisplayType.FLOAT),
                        titleMap[name] || name,
                        hoverDataKey === valueKey(name)
                      ]
                }
              />
            }
          />
          {props.config.shapes.length > 1 && props.config.shapes.length <= 100 ? (
            <Legend
              verticalAlign="top"
              align="left"
              wrapperStyle={{
                paddingLeft: !props.config.yAxises.length || showYLabel ? 0 : 25,
                paddingRight: !props.config.y2Axises.length || showY2Label ? 0 : 25,
                paddingBottom: 15
              }}
              payload={props.config.shapes.map((shape) => ({
                id: shape.key,
                value: shape.title,
                type: 'circle',
                color: ThemingVariables.colors.visualization[shape.color],
                dataKey: valueKey(shape.key),
                yAxisId: calcYAxisId(shape.groupId)
              }))}
              onMouseEnter={
                ((value: { id: string }) => {
                  setHoverDataKey(valueKey(value.id))
                }) as unknown as (event: MouseEvent) => void
              }
              onMouseLeave={() => {
                setHoverDataKey(undefined)
              }}
              content={LegendContent}
            />
          ) : null}
          {sortBy(
            props.config.shapes,
            (shape) =>
              ({
                [ComboShape.LINE]: 3,
                [ComboShape.AREA]: 2,
                [ComboShape.BAR]: 1
              }[groups[shape.groupId]?.shape!])
          ).map(({ key, groupId, color }) => {
            const group = groups[groupId]
            if (!group) {
              return null
            }
            const stackId = {
              [ComboStack.NONE]: undefined,
              [ComboStack.STACK]: group.key,
              [ComboStack.STACK_100]: group.key
            }[group.stackType]
            return group.shape === ComboShape.LINE ? (
              <Line
                key={key}
                yAxisId={calcYAxisId(group.key)}
                type={group.type}
                dataKey={valueKey(key)}
                connectNulls={group.connectNulls}
                name={key}
                stroke={ThemingVariables.colors.visualization[color]}
                isAnimationActive={false}
                opacity={hoverDataKey === undefined || hoverDataKey === valueKey(key) ? 1 : 0.3}
                dot={{
                  display: props.config.shapes.length * result100.length > 50 ? 'none' : undefined,
                  onMouseEnter: () => {
                    setHoverDataKey(valueKey(key))
                  },
                  onMouseLeave: handleMouseLeave
                }}
                activeDot={
                  hoverDataKey === valueKey(key)
                    ? {
                        strokeWidth: 0,
                        fill: ThemingVariables.colors.visualization[color],
                        onMouseEnter: () => {
                          setHoverDataKey(valueKey(key))
                        },
                        onMouseLeave: handleMouseLeave
                      }
                    : {
                        display: 'none'
                      }
                }
                strokeWidth={2}
                onMouseEnter={() => {
                  setHoverDataKey(valueKey(key))
                }}
                onMouseLeave={handleMouseLeave}
              />
            ) : group.shape === ComboShape.AREA ? (
              <Area
                key={key}
                name={key}
                type={group.type}
                stackId={stackId}
                yAxisId={calcYAxisId(group.key)}
                dataKey={valueKey(key)}
                stroke={ThemingVariables.colors.visualization[color]}
                strokeWidth={2}
                stopOpacity={hoverDataKey === undefined || hoverDataKey === valueKey(key) ? 1 : 0.3}
                fill={ThemingVariables.colors.visualization[color]}
                fillOpacity={0.3}
                isAnimationActive={false}
                opacity={hoverDataKey === undefined || hoverDataKey === valueKey(key) ? 1 : 0.3}
                connectNulls={group.connectNulls}
                dot={{
                  display: 'none',
                  onMouseEnter: () => {
                    setHoverDataKey(valueKey(key))
                  },
                  onMouseLeave: handleMouseLeave
                }}
                activeDot={
                  hoverDataKey === valueKey(key)
                    ? {
                        strokeWidth: 0,
                        fill: ThemingVariables.colors.visualization[color],
                        onMouseEnter: () => {
                          setHoverDataKey(valueKey(key))
                        },
                        onMouseLeave: handleMouseLeave
                      }
                    : {
                        display: 'none'
                      }
                }
                onMouseEnter={() => {
                  setHoverDataKey(valueKey(key))
                }}
                onMouseLeave={handleMouseLeave}
              />
            ) : group.shape === ComboShape.BAR ? (
              <Bar
                key={key}
                name={key}
                stackId={stackId}
                yAxisId={calcYAxisId(group.key)}
                dataKey={valueKey(key)}
                strokeWidth={0}
                maxBarSize={isContinuous(xDisplayType) ? 20 : undefined}
                fill={ThemingVariables.colors.visualization[color]}
                isAnimationActive={false}
                opacity={hoverDataKey === undefined || hoverDataKey === valueKey(key) ? 1 : 0.3}
                onMouseEnter={() => {
                  setHoverDataKey(valueKey(key))
                }}
                onMouseLeave={handleMouseLeave}
              />
            ) : null
          })}
          {props.config.referenceYValue === undefined ? null : (
            <ReferenceLine
              yAxisId={
                props.config.yAxises.length && !props.config.y2Axises.length
                  ? 'left'
                  : !props.config.yAxises.length && props.config.y2Axises.length
                  ? 'right'
                  : props.config.referenceYAxis
              }
              className={css`
                & text {
                  stroke: ${ThemingVariables.colors.text[1]};
                  transform: translateX(calc(50% - 100px));
                }
              `}
              y={props.config.referenceYValue}
              stroke={ThemingVariables.colors.visualizationOther}
              isFront={true}
              label={props.config.referenceYLabel}
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          )}
          {props.config.shapes.map(({ key, groupId, color, hasTrendline }) =>
            hasTrendline ? (
              <Line
                key={`${key}${trendSuffix}`}
                yAxisId={calcYAxisId(groupId)}
                type={trendline}
                dataKey={valueKey(key)}
                connectNulls={true}
                name={`${key}${trendSuffix}`}
                stroke={ThemingVariables.colors.visualization[color]}
                isAnimationActive={false}
                opacity={hoverDataKey === undefined || hoverDataKey === valueKey(key) ? 1 : 0.3}
                dot={{ display: 'none' }}
                activeDot={{ display: 'none' }}
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            ) : null
          )}
        </ComposedChart>
      </ResponsiveContainer>
    )
  }
}

function AxisFormItem(props: { label: string; children: ReactNode }) {
  return (
    <div
      className={css`
        display: inline-block;
        margin: 5px;
      `}
    >
      <div
        className={css`
          font-size: 12px;
          color: ${ThemingVariables.colors.text[1]};
          margin-bottom: 5px;
        `}
      >
        {props.label}
      </div>
      {props.children}
    </div>
  )
}

function AxisSelect(props: {
  className?: string
  options: string[]
  disabled?: boolean
  onSelect(value: string): void
}) {
  const ref = useRef<HTMLSelectElement>(null)

  return (
    <select
      ref={ref}
      className={cx(
        css`
          vertical-align: top;
          display: inline;
          appearance: none;
          border: none;
          outline: none;
          font-size: 14px;
          font-weight: 400;
          cursor: pointer;
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          border-radius: 8px;
          height: 36px;
          width: 185px;
          background-repeat: no-repeat;
          background-position: 50% 50%;
          color: transparent;

          &:disabled {
            cursor: not-allowed;
            border: 1px dashed ${ThemingVariables.colors.gray[1]};
          }
        `,
        props.className
      )}
      disabled={props.disabled}
      style={{
        backgroundImage: SVG2DataURI(IconCommonAdd)
      }}
      value={''}
      onChange={
        props.disabled
          ? undefined
          : (e) => {
              props.onSelect(e.target.value)
              if (ref.current) {
                ref.current.selectedIndex = 0
              }
            }
      }
    >
      <option value={''} disabled={true}>
        Select axis
      </option>
      {props.options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}
