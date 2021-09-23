import { useEffect, useMemo, useState, MouseEvent } from 'react'
import { orderBy, sumBy } from 'lodash'
import { css } from '@emotion/css'
import { Pie, Label, PieChart, Tooltip, Legend, Cell } from '@tellery/recharts'
import { useTextWidth } from '@tag0/use-text-width'
import { DisplayType, Type } from '../types'
import type { Chart } from './base'
import { LegendContentVertical } from '../components/LegendContentVertical'
import { formatRecord, isNumeric, isTimeSeries } from '../utils'
import { ConfigSelect } from '../components/ConfigSelect'
import { ConfigNumericInput } from '../components/ConfigNumericInput'
import { SliceSelector } from '../components/SliceSelector'
import { ThemingVariables } from '@app/styles'
import { CustomTooltip } from '../components/CustomTooltip'
import { fontFamily } from '../constants'
import { useCrossFilter } from '@app/hooks/useDataRecords'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'
import i18n from '@app/i18n'
import FormSwitch from '@app/components/kit/FormSwitch'
import { ConfigTab } from '../components/ConfigTab'
import { ConfigSection } from '../components/ConfigSection'
import { ConfigItem } from '../components/ConfigItem'

const opacity = 0.15

const OTHERS_KEY = 'Others'

const numberformat = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 2 })

export const pie: Chart<Type.PIE> = {
  type: Type.PIE,

  initializeConfig(data, cache) {
    if (cache[Type.PIE]) {
      return cache[Type.PIE]!
    }
    return {
      type: Type.PIE,

      keys: data.fields.map(({ name }) => name),

      dimension: data.fields.find(({ displayType }) => displayType === DisplayType.STRING)?.name || data.fields[0].name,
      measurement:
        data.fields.find(({ displayType }) => isNumeric(displayType) && !isTimeSeries(displayType))?.name ||
        data.fields[0].name,
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
        orderBy(props.config.slices, ['key'])
          .map(({ key }) => key)
          .join() ===
        orderBy(data, ['key'])
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

    return (
      <ConfigTab tabs={['Data', 'Display']}>
        <div>
          <ConfigSection title="Dimension">
            <ConfigSelect
              options={props.config.keys}
              value={props.config.dimension}
              onChange={(dimension) => {
                onConfigChange('dimension', dimension)
              }}
            />
          </ConfigSection>
          <ConfigSection title="Value">
            <ConfigSelect
              options={props.config.keys}
              value={props.config.measurement}
              onChange={(measurement) => {
                onConfigChange('measurement', measurement)
              }}
            />
          </ConfigSection>
        </div>
        <div>
          <ConfigSection>
            <ConfigItem label="Show total">
              <div
                className={css`
                  display: flex;
                  justify-content: flex-end;
                  line-height: 0;
                  padding-right: 6px;
                `}
              >
                <FormSwitch
                  checked={props.config.showTotal}
                  onChange={(e) => {
                    onConfigChange('showTotal', e.target.checked)
                  }}
                />
              </div>
            </ConfigItem>
            <ConfigItem label="Show legend">
              <div
                className={css`
                  display: flex;
                  justify-content: flex-end;
                  line-height: 0;
                  padding-right: 6px;
                `}
              >
                <FormSwitch
                  checked={props.config.showLegend}
                  onChange={(e) => {
                    onConfigChange('showLegend', e.target.checked)
                  }}
                />
              </div>
            </ConfigItem>
            <ConfigItem label="Min percentage">
              <ConfigNumericInput
                placeholder="%"
                min={0}
                value={props.config.minPercentage}
                onChange={(minPercentage) => {
                  onConfigChange('minPercentage', minPercentage)
                }}
                className={css`
                  text-align: end;
                `}
              />
            </ConfigItem>
          </ConfigSection>
          <ConfigSection title="Slices">
            {props.config.slices.map((item) => (
              <SliceSelector
                key={item.key}
                value={item}
                onChange={(value) => {
                  onConfigChange(
                    'slices',
                    props.config.slices.map((slice) => (slice.key === item.key ? { ...item, ...value } : slice))
                  )
                }}
                className={css`
                  padding: 0 6px;
                `}
              />
            ))}
          </ConfigSection>
        </div>
      </ConfigTab>
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
      props.config.showTotal && totalWidth < Math.min(props.dimensions.width, props.dimensions.height) / 2 - 10
    const showLegend = props.config.showLegend && props.dimensions.width - props.dimensions.height >= 100

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
        {showLegend ? (
          <Legend
            verticalAlign="middle"
            align="left"
            wrapperStyle={{
              width: `calc(${(1 - ratio) * 100}% - 10px)`,
              height: Math.min(props.config.slices.length * 21, props.dimensions.height),
              overflowY: 'hidden'
            }}
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
          allowEscapeViewBox={{ x: false, y: true }}
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
          cx={showLegend ? `${(1 - ratio / 2) * 100}%` : '50%'}
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
                  ? hoverDataKey === key
                    ? ThemingVariables.colors.visualizationOtherHighlight
                    : ThemingVariables.colors.visualizationOther
                  : ThemingVariables.colors.visualization[color]
              }
              opacity={hoverDataKey === undefined || hoverDataKey === key ? 1 : opacity}
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
