import { useEffect, useMemo, useState, MouseEvent } from 'react'
import { orderBy, sumBy } from 'lodash'
import { css } from '@emotion/css'
import { Pie, Label, PieChart, Tooltip, Legend, Cell } from '@tellery/recharts'
import { useTextWidth } from '@imagemarker/use-text-width'

import { DisplayType, Type } from '../types'
import type { Chart } from './base'
import { LegendContentVertical } from '../components/LegendContentVertical'
import { formatRecord, isNumeric } from '../utils'
import { ConfigButton } from '../components/ConfigButton'
import { ConfigLabel } from '../components/ConfigLabel'
import { ConfigSelect } from '../components/ConfigSelect'
import { ConfigNumericInput } from '../components/ConfigNumericInput'
import { ConfigSwitch } from '../components/ConfigSwitch'
import { SliceSelector } from '../components/SliceSelector'
import { ThemingVariables } from '@app/styles'
import { CustomTooltip } from '../components/CustomTooltip'
import { fontFamily } from '../constants'
import { useCrossFilter } from '@app/hooks/useDataRecords'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'

enum Tab {
  DATA = 'Data',
  DISPLAY = 'Display'
}

const OTHERS_KEY = 'Others'

const numberformat = new Intl.NumberFormat([], { maximumFractionDigits: 2 })

export const pie: Chart<Type.PIE> = {
  type: Type.PIE,

  initializeConfig(data, cache) {
    if (cache[Type.PIE]) {
      return cache[Type.PIE]!
    }
    return {
      type: Type.PIE,

      keys: data.fields.map(({ name }) => name),

      dimension: data.fields.find(({ displayType }) => displayType === DisplayType.STRING)?.name || '',
      measurement:
        data.fields.find(
          ({ displayType }) =>
            isNumeric(displayType) && displayType !== DisplayType.TIME && displayType !== DisplayType.DATE
        )?.name || '',
      minPercentage: 1,

      showLegend: true,
      showTotal: true,
      slices: []
    }
  },

  Configuration(props) {
    const { dimension, measurement } = props.config
    const { onConfigChange } = props
    const filter = useCrossFilter(props.data)
    const total = useMemo(
      () =>
        filter
          .groupAll<number>()
          .reduceSum((v) => v[measurement] as number)
          .value(),
      [filter, measurement]
    )
    const data = useMemo(() => {
      const array = filter
        .dimension((v) => v[dimension] as number)
        .group<string, number>()
        .reduce(
          (p, v) => {
            return p + (v[measurement] as number)
          },
          (p, v) => {
            return p - (v[measurement] as number)
          },
          () => 0
        )
        .all()
      const filtered = orderBy(
        array.filter(
          (item) => props.config.minPercentage === undefined || item.value / total >= props.config.minPercentage / 100
        ),
        'value',
        'desc'
      )
      const others = total - sumBy(filtered, 'value')
      return filtered.length < array.length ? [...filtered, { key: OTHERS_KEY, value: others }] : filtered
    }, [filter, dimension, measurement, props.config, total])
    useEffect(() => {
      if (
        orderBy(props.config.slices, 'key')
          .map(({ key }) => key)
          .join() ===
        orderBy(data, 'key')
          .map(({ key }) => key)
          .join()
      ) {
        return
      }
      onConfigChange(
        'slices',
        data.map((item, index) => ({
          key: item.key,
          title: item.key,
          color: index % ThemingVariables.colors.visualization.length
        }))
      )
    }, [data, onConfigChange, props.config.slices])
    const [tab, setTab] = useState(Tab.DATA)

    return (
      <div
        className={css`
          height: 100%;
          display: flex;
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
        <div
          className={css`
            overflow-y: auto;
            padding: 20px;
            flex: 1;
          `}
        >
          {tab === Tab.DATA ? (
            <>
              <ConfigLabel top={0}>Dimension</ConfigLabel>
              <ConfigSelect
                options={props.config.keys}
                value={props.config.dimension}
                onChange={(dimension) => {
                  onConfigChange('dimension', dimension)
                }}
                placeholder="Please select"
              />
              <ConfigLabel>Value</ConfigLabel>
              <ConfigSelect
                options={props.config.keys}
                value={props.config.measurement}
                onChange={(measurement) => {
                  onConfigChange('measurement', measurement)
                }}
                placeholder="Please select"
              />
              <ConfigLabel>Min percentage of slices</ConfigLabel>
              <ConfigNumericInput
                placeholder="%"
                min={0}
                value={props.config.minPercentage}
                onChange={(minPercentage) => {
                  onConfigChange('minPercentage', minPercentage)
                }}
              />
            </>
          ) : null}
          {tab === Tab.DISPLAY ? (
            <>
              <ConfigLabel top={0}>Show total</ConfigLabel>
              <ConfigSwitch
                value={props.config.showTotal}
                onChange={(showTotal) => {
                  onConfigChange('showTotal', showTotal)
                }}
              />
              <ConfigLabel>Show legend</ConfigLabel>
              <ConfigSwitch
                value={props.config.showLegend}
                onChange={(showLegend) => {
                  onConfigChange('showLegend', showLegend)
                }}
              />
              <ConfigLabel>Slices</ConfigLabel>
              <div
                className={css`
                  margin: -5px;
                `}
              >
                {props.config.slices.map((item) => (
                  <SliceSelector
                    key={item.key}
                    className={css`
                      margin: 5px;
                    `}
                    value={item}
                    onChange={(value) => {
                      onConfigChange(
                        'slices',
                        props.config.slices.map((slice) => (slice.key === item.key ? { ...item, ...value } : slice))
                      )
                    }}
                  />
                ))}
              </div>
              {props.config.slices.length === 0 ? (
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
                  No slices. Click to configure data
                </span>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    )
  },

  Diagram(props) {
    const { dimension, measurement } = props.config
    const filter = useCrossFilter(props.data)
    const displayTypes = useDataFieldsDisplayType(props.data.fields)
    const total = useMemo(
      () =>
        filter
          .groupAll<number>()
          .reduceSum((v) => v[measurement] as number)
          .value(),
      [filter, measurement]
    )
    const data = useMemo(() => {
      const array = filter
        .dimension((v) => v[dimension] as number)
        .group<string, number>()
        .reduce(
          (p, v) => {
            return p + (v[measurement] as number)
          },
          (p, v) => {
            return p - (v[measurement] as number)
          },
          () => 0
        )
        .all()
      const filtered = orderBy(
        array.filter(
          (item) => props.config.minPercentage === undefined || item.value / total >= props.config.minPercentage / 100
        ),
        'value',
        'desc'
      )
      const others = total - sumBy(filtered, 'value')
      return filtered.length < array.length ? [...filtered, { key: OTHERS_KEY, value: others }] : filtered
    }, [filter, dimension, measurement, props.config, total])
    const [hoverDataKey, setHoverDataKey] = useState<string>()
    const titleMap = useMemo(
      () =>
        props.config.slices.reduce<{ [key: string]: string }>((obj, { key, title }) => {
          obj[key] = title
          return obj
        }, {}),
      [props.config]
    )
    const ratio = Math.min(props.dimensions.height / props.dimensions.width, 1)
    const totalStr = formatRecord(total, displayTypes[measurement])
    const totalWidth = useTextWidth({ text: totalStr, font: `18px ${fontFamily}` })
    const showTotal =
      props.config.showTotal && totalWidth < Math.min(props.dimensions.width, props.dimensions.height) / 2

    return (
      <PieChart
        width={props.dimensions.width}
        height={props.dimensions.height}
        data={data}
        className={css`
          font-size: 14px;

          svg path {
            transition: opacity 0.2s;
          }
        `}
      >
        {props.config.showLegend && ratio <= 0.9 ? (
          <Legend
            verticalAlign="middle"
            align="left"
            wrapperStyle={{ width: `calc(${(1 - ratio) * 100}% - 10px)`, maxHeight: '100%', overflowY: 'auto' }}
            payload={props.config.slices.map((slice) => ({
              id: slice.key,
              value: slice.title,
              type: 'circle',
              color:
                slice.key === OTHERS_KEY
                  ? ThemingVariables.colors.visualizationOther
                  : ThemingVariables.colors.visualization[slice.color]
            }))}
            onMouseEnter={
              ((value: { id: string }) => {
                setHoverDataKey(value.id)
              }) as unknown as (event: MouseEvent) => void
            }
            onMouseLeave={() => {
              setHoverDataKey(undefined)
            }}
            content={LegendContentVertical}
          />
        ) : null}
        <Tooltip
          wrapperStyle={{ zIndex: 9999999 }}
          isAnimationActive={false}
          content={
            <CustomTooltip
              displayTypes={displayTypes}
              hide={hoverDataKey === undefined}
              formatter={(value: unknown, name: string) => [
                `${formatRecord(value, displayTypes[measurement])} (${numberformat.format(
                  ((value as number) / total) * 100
                )}%)`,
                titleMap[name] || name,
                true
              ]}
            />
          }
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="key"
          cx={props.config.showLegend ? `${(1 - ratio / 2) * 100}%` : '50%'}
          cy="50%"
          innerRadius="50%"
          outerRadius="100%"
          paddingAngle={0}
          isAnimationActive={false}
        >
          {showTotal ? (
            <Label color={ThemingVariables.colors.text[0]} value={totalStr} position="center" fontSize={18} />
          ) : null}
          {props.config.slices.map(({ key, color }) => (
            <Cell
              key={key}
              fill={
                key === OTHERS_KEY
                  ? ThemingVariables.colors.visualizationOther
                  : ThemingVariables.colors.visualization[color]
              }
              opacity={hoverDataKey === undefined || hoverDataKey === key ? 1 : 0.3}
              onMouseEnter={() => {
                setHoverDataKey(key)
              }}
              onMouseLeave={() => {
                setHoverDataKey(undefined)
              }}
            />
          ))}
        </Pie>
      </PieChart>
    )
  }
}
