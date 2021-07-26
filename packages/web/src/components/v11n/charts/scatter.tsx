import React, { useMemo, useState, MouseEvent, ReactNode } from 'react'
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
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useTextWidth } from '@imagemarker/use-text-width'
import { DisplayType, Type } from '../types'
import type { Chart } from './base'
import { ConfigButton } from '../components/ConfigButton'
import { ConfigLabel } from '../components/ConfigLabel'
import { ConfigSelectWithClear } from '../components/ConfigSelectWithClear'
import { ConfigSelect } from '../components/ConfigSelect'
import { CustomTooltip } from '../components/CustomTooltip'
import { formatNumber, formatRecord, isContinuous, isNumeric } from '../utils'
import { LegendContent } from '../components/LegendContent'
import { ColorSelector } from '../components/ColorSelector'
import { ThemingVariables } from '@app/styles'
import { ConfigNumericInput } from '../components/ConfigNumericInput'
import { fontFamily } from '../constants'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'
import { ConfigInput } from '../components/ConfigInput'
import { useDataRecords } from '@app/hooks/useDataRecords'

enum Tab {
  DATA = 'Data',
  DISPLAY = 'Display',
  AXIS = 'Axis'
}

const scaleTypes = ['auto', 'linear', 'pow', 'sqrt', 'log']

export const scatter: Chart<Type.SCATTER> = {
  type: Type.SCATTER,

  initializeConfig(data, cache) {
    if (cache[Type.SCATTER]) {
      return cache[Type.SCATTER]!
    }
    // pick a number column as Y axis
    const y = data.fields.find(
      ({ displayType }) =>
        isNumeric(displayType) && displayType !== DisplayType.TIME && displayType !== DisplayType.DATE
    )
    const x =
      // first, try to pick a time column as X axis
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
      yLabel: y?.name || '',
      yScale: 'auto',
      yRangeMin: 0,
      yRangeMax: undefined
    }
  },

  Configuration(props) {
    const { onConfigChange } = props
    const [tab, setTab] = useState(Tab.DATA)
    const records = useDataRecords(props.data)

    return (
      <div
        className={css`
          height: 100%;
          display: flex;
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
              <ConfigLabel top={0}>X axis</ConfigLabel>
              <ConfigSelect
                options={props.config.keys}
                value={props.config.xAxis}
                onChange={(xAxis) => {
                  onConfigChange('xAxis', xAxis, 'xLabel', xAxis)
                  if (!isNumeric(props.data.fields.find((field) => field.name === props.config.xAxis)?.displayType)) {
                    onConfigChange('referenceXLabel', '', 'referenceXValue', undefined)
                  }
                }}
                placeholder="Please select"
              />
              <ConfigLabel>Y axis</ConfigLabel>
              <ConfigSelect
                options={props.config.keys}
                value={props.config.yAxis}
                onChange={(yAxis) => {
                  onConfigChange('yAxis', yAxis, 'yLabel', yAxis)
                }}
                placeholder="Please select"
              />
              <ConfigLabel>Color</ConfigLabel>
              <ConfigSelectWithClear
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
                          color: index % ThemingVariables.colors.visualization.length
                        }))
                      : []
                  )
                }}
                placeholder="Please select"
              />
              <ConfigLabel>Size</ConfigLabel>
              <ConfigSelectWithClear
                options={props.config.keys}
                value={props.config.size}
                onChange={(size) => {
                  onConfigChange('size', size)
                }}
                placeholder="Please select"
              />
            </>
          ) : null}
          {tab === Tab.DISPLAY ? (
            <>
              <ConfigLabel top={0}>Colors</ConfigLabel>
              {props.config.colors.length === 0 ? (
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
                  No colors. Click to configure data
                </span>
              ) : null}
              <div
                className={css`
                  margin: -5px;
                `}
              >
                {props.config.colors.map((color) => (
                  <ColorSelector
                    key={color.key}
                    className={css`
                      margin: 5px;
                    `}
                    value={color}
                    onChange={(value) => {
                      onConfigChange(
                        'colors',
                        props.config.colors.map((c) => (c.key === color.key ? value : c))
                      )
                    }}
                  />
                ))}
              </div>
              {isNumeric(props.data.fields.find((field) => field.name === props.config.xAxis)?.displayType) ? (
                <>
                  <ConfigLabel>X reference line</ConfigLabel>
                  <div
                    className={css`
                      margin: -5px;
                    `}
                  >
                    <AxisFormItem label="Label">
                      <ConfigInput
                        value={props.config.referenceXLabel}
                        onChange={(value) => {
                          onConfigChange('referenceXLabel', value)
                        }}
                      />
                    </AxisFormItem>
                    <AxisFormItem label="Value">
                      <ConfigNumericInput
                        value={props.config.referenceXValue}
                        onChange={(value) => {
                          onConfigChange('referenceXValue', value)
                        }}
                      />
                    </AxisFormItem>
                  </div>
                </>
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
              <ConfigLabel>Y axis</ConfigLabel>
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
            </>
          ) : null}
        </PerfectScrollbar>
      </div>
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
            bottom: showXLabel ? 10 : -10,
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
                color: ThemingVariables.colors.visualization[color.color]
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
            tickFormatter={(tick) => formatRecord(tick, displayTypes[props.config.xAxis])}
            stroke={ThemingVariables.colors.text[1]}
            type={isContinuous(displayTypes[props.config.xAxis]) ? 'number' : 'category'}
            allowDuplicatedCategory={false}
          />
          <YAxis
            dataKey={props.config.yAxis}
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
                      fill={ThemingVariables.colors.visualization[color.color]}
                      opacity={hoverDataKey === undefined || hoverDataKey === color.key ? 1 : 0.3}
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
