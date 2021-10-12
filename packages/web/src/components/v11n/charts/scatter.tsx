import React, { useMemo, useState, MouseEvent } from 'react'
import { css } from '@emotion/css'
import {
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis
} from '@tellery/recharts'
import { groupBy, orderBy } from 'lodash'
import { useTextWidth } from '@tag0/use-text-width'
import { DisplayType, Type } from '../types'
import type { Chart } from './base'
import { ConfigSelect } from '../components/ConfigSelect'
import { CustomTooltip } from '../components/CustomTooltip'
import { formatNumber, formatRecord, isNumeric, isTimeSeries } from '../utils'
import { LegendContent } from '../components/LegendContent'
import { ColorSelector } from '../components/ColorSelector'
import { ThemingVariables } from '@app/styles'
import { ConfigNumericInput } from '../components/ConfigNumericInput'
import { fontFamily } from '../constants'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'
import { ConfigInput } from '../components/ConfigInput'
import { useDataRecords } from '@app/hooks/useDataRecords'
import { ConfigTab } from '../components/ConfigTab'
import { ConfigSection } from '../components/ConfigSection'
import { ConfigItem } from '../components/ConfigItem'
import ConfigIconButton from '../components/ConfigIconButton'
import { IconCommonAdd, IconCommonSub } from '@app/assets/icons'

const opacity = 0.15

const scaleTypes = ['auto', 'linear', 'pow', 'sqrt', 'log']

export const scatter: Chart<Type.SCATTER> = {
  type: Type.SCATTER,

  initializeConfig(data, { cache }) {
    if (cache[Type.SCATTER]) {
      return cache[Type.SCATTER]!
    }
    // pick a number column as Y axis
    const y = data.fields.find(({ displayType }) => isNumeric(displayType) && !isTimeSeries(displayType))
    const x =
      // first, try to pick a time column as X axis
      data.fields.find(
        ({ name, displayType }) =>
          // X and Y axis can't be the same
          name !== y?.name && (isTimeSeries(displayType) || name === 'dt' || name === 'date' || name === 'ts')
      ) ||
      // then, pick numeric data as the X axis
      data.fields.find(({ name, displayType }) => name !== y?.name && isNumeric(displayType)) ||
      // last, pick string type column as the X axis
      data.fields.find(({ name, displayType }) => name !== y?.name && displayType === DisplayType.STRING)

    return {
      type: Type.SCATTER,

      keys: data.fields.map(({ name }) => name),

      xAxis: x?.name || '',
      yAxis: y?.name || '',
      color: '',
      size: '',

      colors: [],
      referenceXLabel: '',
      referenceXValue: undefined,
      referenceYLabel: '',
      referenceYValue: undefined,

      xLabel: x?.name || '',
      xType: x ? (isNumeric(x.displayType) ? 'linear' : 'ordinal') : 'ordinal',
      yLabel: y?.name || '',
      yScale: 'auto',
      yRangeMin: 0,
      yRangeMax: undefined
    }
  },

  Configuration(props) {
    const { onConfigChange } = props
    const records = useDataRecords(props.data)
    const displayTypes = useDataFieldsDisplayType(props.data.fields)

    return (
      <ConfigTab tabs={['Data', 'Display', 'Axis']}>
        <div>
          <ConfigSection title="X axis">
            <ConfigSelect
              options={props.config.keys}
              value={props.config.xAxis}
              onChange={(xAxis) => {
                onConfigChange('xAxis', xAxis, 'xLabel', xAxis)
                if (!isNumeric(props.data.fields.find((field) => field.name === props.config.xAxis)?.displayType)) {
                  onConfigChange('referenceXLabel', '', 'referenceXValue', undefined)
                }
                onConfigChange('xAxis', xAxis, 'xType', isNumeric(displayTypes[xAxis]) ? 'linear' : 'ordinal')
              }}
            />
          </ConfigSection>
          <ConfigSection title="Y axis">
            <ConfigSelect
              options={props.config.keys}
              value={props.config.yAxis}
              onChange={(yAxis) => {
                onConfigChange('yAxis', yAxis, 'yLabel', yAxis)
              }}
            />
          </ConfigSection>
          <ConfigSection
            title="Color"
            right={
              props.config.color ? null : (
                <ConfigIconButton
                  icon={IconCommonAdd}
                  onClick={() => {
                    const color = props.config.keys[0]
                    onConfigChange(
                      'color',
                      color,
                      'colors',
                      color
                        ? Object.keys(groupBy(records, color)).map((c, index) => ({
                            key: c,
                            color: index
                          }))
                        : []
                    )
                  }}
                />
              )
            }
          >
            {props.config.color ? (
              <div
                className={css`
                  display: flex;
                  width: 100%;
                  > button {
                    visibility: hidden;
                  }
                  :hover > button {
                    visibility: visible;
                  }
                `}
              >
                <ConfigSelect
                  options={props.config.keys}
                  value={props.config.color}
                  onChange={(color) => {
                    onConfigChange(
                      'color',
                      color,
                      'colors',
                      color
                        ? Object.keys(groupBy(records, color)).map((c, index) => ({
                            key: c,
                            color: index
                          }))
                        : []
                    )
                  }}
                />
                <ConfigIconButton
                  icon={IconCommonSub}
                  onClick={() => {
                    onConfigChange('color', undefined, 'colors', [])
                  }}
                  className={css`
                    margin-left: 4px;
                  `}
                />
              </div>
            ) : null}
          </ConfigSection>
          <ConfigSection
            title="Size"
            right={
              props.config.size ? null : (
                <ConfigIconButton
                  icon={IconCommonAdd}
                  onClick={() => {
                    const size = props.config.keys[0]
                    onConfigChange('size', size)
                  }}
                />
              )
            }
          >
            {props.config.size ? (
              <div
                className={css`
                  display: flex;
                  width: 100%;
                  > button {
                    visibility: hidden;
                  }
                  :hover > button {
                    visibility: visible;
                  }
                `}
              >
                <ConfigSelect
                  options={props.config.keys}
                  value={props.config.size}
                  onChange={(size) => {
                    onConfigChange('size', size)
                  }}
                />
                <ConfigIconButton
                  icon={IconCommonSub}
                  onClick={() => {
                    onConfigChange('size', undefined)
                  }}
                  className={css`
                    margin-left: 4px;
                  `}
                />
              </div>
            ) : null}
          </ConfigSection>
        </div>
        <div>
          <ConfigSection title="Colors">
            {props.config.colors.map((color) => (
              <ColorSelector
                key={color.key}
                value={color}
                onChange={(value) => {
                  onConfigChange(
                    'colors',
                    props.config.colors.map((c) => (c.key === color.key ? value : c))
                  )
                }}
                className={css`
                  padding-left: 6px;
                `}
              />
            ))}
          </ConfigSection>
          {isNumeric(props.data.fields.find((field) => field.name === props.config.xAxis)?.displayType) ? (
            <>
              <ConfigSection title="X reference line">
                <ConfigItem label="Label">
                  <ConfigInput
                    value={props.config.referenceXLabel}
                    onChange={(value) => {
                      onConfigChange('referenceXLabel', value)
                    }}
                  />
                </ConfigItem>
                <ConfigItem label="Value">
                  <ConfigNumericInput
                    value={props.config.referenceXValue}
                    onChange={(value) => {
                      onConfigChange('referenceXValue', value)
                    }}
                  />
                </ConfigItem>
              </ConfigSection>
            </>
          ) : null}
          <ConfigSection title="Y reference line">
            <ConfigItem label="Label">
              <ConfigInput
                value={props.config.referenceYLabel}
                onChange={(value) => {
                  onConfigChange('referenceYLabel', value)
                }}
              />
            </ConfigItem>
            <ConfigItem label="Value">
              <ConfigNumericInput
                value={props.config.referenceYValue}
                onChange={(value) => {
                  onConfigChange('referenceYValue', value)
                }}
              />
            </ConfigItem>
          </ConfigSection>
        </div>
        <div>
          <ConfigSection title="X axis">
            <ConfigItem label="Label">
              <ConfigInput
                value={props.config.xLabel}
                onChange={(value) => {
                  onConfigChange('xLabel', value)
                }}
              />
            </ConfigItem>
            <ConfigItem label="Type">
              <ConfigSelect
                disabled={!isNumeric(displayTypes[props.config.xAxis])}
                options={['linear', 'ordinal']}
                value={props.config.xType}
                onChange={(value) => {
                  onConfigChange('xType', value)
                }}
              />
            </ConfigItem>
          </ConfigSection>
          <ConfigSection title="Y axis">
            <ConfigItem label="Label">
              <ConfigInput
                value={props.config.yLabel}
                onChange={(value) => {
                  onConfigChange('yLabel', value)
                }}
              />
            </ConfigItem>
            <ConfigItem label="Scale">
              <ConfigSelect
                options={scaleTypes}
                value={props.config.yScale}
                onChange={(value) => {
                  onConfigChange('yScale', value, 'yRangeMin', value === 'log' ? undefined : 0)
                }}
              />
            </ConfigItem>
            <ConfigItem label="Range">
              <div
                className={css`
                  display: flex;
                  align-items: center;
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
            </ConfigItem>
          </ConfigSection>
        </div>
      </ConfigTab>
    )
  },

  Diagram(props) {
    const colors = props.config.colors
    const records = useDataRecords(props.data)
    const data = useMemo(() => orderBy(records, props.config.xAxis), [props.config.xAxis, records])
    const yLabelOffset = useTextWidth({ text: props.config.yLabel, font: `14px ${fontFamily}` }) / 2
    const [hoverDataKey, setHoverDataKey] = useState<string>()
    const isSmall = props.dimensions.height <= 180 && props.dimensions.width <= 380
    const showXLabel = props.config.xLabel && !isSmall
    const showYLabel = props.config.yLabel && !isSmall
    const displayTypes = useDataFieldsDisplayType(props.data.fields)
    const xDisplayType = displayTypes[props.config.xAxis]

    return (
      <ResponsiveContainer>
        <ScatterChart
          width={props.dimensions.width}
          height={props.dimensions.height}
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
            bottom: showXLabel ? 15 : -10,
            left: !props.config.yAxis || showYLabel ? 2 : -20,
            right: 2
          }}
        >
          <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={ThemingVariables.colors.gray[1]} />
          {colors.length ? (
            <Legend
              verticalAlign="top"
              align="left"
              wrapperStyle={{
                paddingLeft: !props.config.yAxis || showYLabel ? 0 : 25,
                paddingBottom: 15
              }}
              payload={colors.map((color) => ({
                name: color.key,
                dataKey: color.key,
                value: color.key,
                color:
                  color.color >= ThemingVariables.colors.visualization.length
                    ? ThemingVariables.colors.visualizationOther
                    : ThemingVariables.colors.visualization[color.color]
              }))}
              onMouseEnter={
                ((value: { value: string }) => {
                  setHoverDataKey(value.value)
                }) as unknown as (event: MouseEvent) => void
              }
              onMouseLeave={() => {
                setHoverDataKey(undefined)
              }}
              content={LegendContent}
            />
          ) : null}
          <XAxis
            dataKey={props.config.xAxis}
            tickLine={false}
            tickMargin={10}
            axisLine={{ stroke: ThemingVariables.colors.gray[0] }}
            label={
              showXLabel
                ? {
                    value: props.config.xLabel,
                    position: 'insideBottom',
                    offset: -15,
                    color: ThemingVariables.colors.text[0]
                  }
                : undefined
            }
            tickFormatter={(tick) => formatRecord(tick, xDisplayType)}
            stroke={ThemingVariables.colors.text[1]}
            type={
              props.config.xType === 'linear'
                ? 'number'
                : props.config.xType === 'ordinal'
                ? 'category'
                : isNumeric(xDisplayType)
                ? 'number'
                : 'category'
            }
            allowDuplicatedCategory={false}
          />
          <YAxis
            dataKey={props.config.yAxis}
            allowDuplicatedCategory={true}
            tickLine={false}
            axisLine={{ stroke: ThemingVariables.colors.gray[0] }}
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
            tickFormatter={formatNumber}
            stroke={ThemingVariables.colors.text[1]}
            scale={props.config.yScale}
            domain={[
              props.config.yRangeMin === undefined || isNaN(props.config.yRangeMin) ? 'auto' : props.config.yRangeMin,
              props.config.yRangeMax === undefined || isNaN(props.config.yRangeMax) ? 'auto' : props.config.yRangeMax
            ]}
          />
          <ZAxis dataKey={props.config.size} range={isSmall ? [10, 100] : [40, 400]} />
          <Tooltip
            cursor={false}
            wrapperStyle={{ zIndex: 9999999 }}
            isAnimationActive={false}
            allowEscapeViewBox={{ x: false, y: true }}
            content={
              <CustomTooltip
                displayTypes={displayTypes}
                color={props.config.color}
                formatter={(value: unknown, name: string) => [formatRecord(value, DisplayType.FLOAT), name, true]}
                hideDot={true}
                hideLabel={true}
              />
            }
          />
          <Scatter
            data={data}
            fill={ThemingVariables.colors.visualization[0]}
            isAnimationActive={false}
            stroke={ThemingVariables.colors.gray[4]}
            strokeWidth={0.5}
          >
            {colors.length
              ? data.map((item, index) => {
                  const color = colors.find((c) => c.key === String(item[props.config.color!]))
                  if (!color) {
                    return null
                  }
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        color.color >= ThemingVariables.colors.visualization.length
                          ? hoverDataKey === color.key
                            ? ThemingVariables.colors.visualizationOtherHighlight
                            : ThemingVariables.colors.visualizationOther
                          : ThemingVariables.colors.visualization[color.color]
                      }
                      opacity={hoverDataKey === undefined || hoverDataKey === color.key ? 1 : opacity}
                      onMouseEnter={() => {
                        setHoverDataKey(color.key)
                      }}
                      onMouseLeave={() => {
                        setHoverDataKey(undefined)
                      }}
                    />
                  )
                })
              : null}
          </Scatter>
          {props.config.referenceXValue === undefined ? null : (
            <ReferenceLine
              className={css`
                & text {
                  stroke: ${ThemingVariables.colors.text[1]};
                  transform: translateY(calc(-50% + 50px));
                }
              `}
              x={props.config.referenceXValue}
              stroke={ThemingVariables.colors.visualizationOther}
              isFront={true}
              label={props.config.referenceXLabel}
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          )}
          {props.config.referenceYValue === undefined ? null : (
            <ReferenceLine
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
        </ScatterChart>
      </ResponsiveContainer>
    )
  }
}
