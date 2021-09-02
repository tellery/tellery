import { IconCommonAdd } from '@app/assets/icons'
import { useGetProfileSpec, useSnapshot } from '@app/hooks/api'
import { useDimensions } from '@app/hooks/useDimensions'
import { ThemingVariables } from '@app/styles'
import { Editor, Metric, Snapshot } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { css, cx } from '@emotion/css'
import { useEffect, useRef, useState, useMemo } from 'react'
import { FormButton } from './kit/FormButton'
import FormDropdown from './kit/FormDropdown'
import { MenuItem } from './MenuItem'
import { MenuItemDivider } from './MenuItemDivider'
import { MenuWrapper } from './MenuWrapper'
import { table } from './v11n/charts/table'
import PerfectScrollbar from 'react-perfect-scrollbar'
import FormSwitch from './kit/FormSwitch'
import FormInput from './kit/FormInput'
import produce from 'immer'
import Tippy from '@tippyjs/react'

export default function QueryBuilderConfig(props: {
  snapshotId?: string
  type: Editor.BlockType
  metrics?: { [id: string]: Metric }
  onChange(fields: { name: string; type: string }[], metrics: { [id: string]: Metric }): void
  className?: string
}) {
  const [isQueryBuilder, setIsQueryBuilder] = useState(false)
  useEffect(() => {
    setIsQueryBuilder(props.type === Editor.BlockType.QueryBuilder)
  }, [props.type])
  const snapshot = useSnapshot(props.snapshotId)
  const fields = useMemo(
    () =>
      snapshot?.data.fields
        .filter((field) => field.sqlType)
        .map((field) => ({ name: field.name, type: field.sqlType! })),
    [snapshot?.data.fields]
  )

  if (!isQueryBuilder || !snapshot || !fields) {
    return (
      <div
        className={cx(
          css`
            display: flex;
            align-items: center;
            justify-content: center;
          `,
          props.className
        )}
      >
        <Tippy content="Must execute query first" disabled={!!snapshot?.data.fields.length}>
          <div>
            <FormButton
              disabled={!snapshot?.data.fields.length}
              variant="primary"
              onClick={() => setIsQueryBuilder(true)}
            >
              Create as data asset
            </FormButton>
          </div>
        </Tippy>
      </div>
    )
  }
  return (
    <div
      className={cx(
        css`
          display: flex;
        `,
        props.className
      )}
    >
      <QueryBuilderConfigInner
        fields={fields}
        value={props.metrics || {}}
        onChange={(metrics) => {
          console.log('metrics', metrics)
          props.onChange(fields, metrics)
        }}
      />
      <Preview snapshot={snapshot} />
    </div>
  )
}

function Preview(props: { snapshot: Snapshot }) {
  const ref = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(ref, 0)

  return (
    <div
      ref={ref}
      className={css`
        height: 100%;
        width: 0;
        flex: 1;
        padding: 16px;
      `}
    >
      <table.Diagram
        dimensions={dimensions}
        config={table.initializeConfig(props.snapshot.data, {})}
        data={props.snapshot.data}
      />
    </div>
  )
}

function QueryBuilderConfigInner(props: {
  fields: {
    name: string
    type: string
  }[]
  value: {
    [id: string]: Metric
  }
  onChange(value: { [id: string]: Metric }): void
}) {
  const [activeMetricId, setActiveMetricId] = useState<string>()
  const activeMetric = activeMetricId ? props.value?.[activeMetricId] : undefined

  return (
    <>
      <div
        className={css`
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 16px;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            justify-content: space-between;
          `}
        >
          <h3
            className={css`
              margin: 0;
              font-weight: 500;
              font-size: 12px;
              line-height: 15px;
              color: ${ThemingVariables.colors.text[0]};
            `}
          >
            Metrics
          </h3>
          <IconCommonAdd
            color={ThemingVariables.colors.text[0]}
            onClick={() => {
              setActiveMetricId(undefined)
            }}
            className={css`
              cursor: pointer;
            `}
          />
        </div>
        {Object.entries(props.value).map(([id, metric]) => (
          <div
            key={id}
            onClick={() => {
              setActiveMetricId(id)
            }}
            className={cx(
              css`
                height: 36px;
                border-radius: 8px;
                margin-top: 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
                font-weight: normal;
                font-size: 12px;
              `,
              id === activeMetricId &&
                css`
                  background: ${ThemingVariables.colors.primary[1]};
                `
            )}
          >
            <span
              className={cx(
                css`
                  padding: 0 16px;
                  font-size: 14px;
                `,
                id === activeMetricId
                  ? css`
                      color: ${ThemingVariables.colors.gray[5]};
                    `
                  : css`
                      color: ${ThemingVariables.colors.text[0]};
                    `
              )}
            >
              {metric.name}
            </span>
          </div>
        ))}
      </div>
      <PerfectScrollbar
        options={{ suppressScrollX: true }}
        className={css`
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 16px;
        `}
      >
        <h3
          className={css`
            margin: 0;
            font-weight: 500;
            font-size: 12px;
            line-height: 15px;
            color: ${ThemingVariables.colors.text[0]};
          `}
        >
          {activeMetricId ? 'Metric information' : 'New metric'}
        </h3>
        {activeMetricId ? (
          <>
            <div
              className={css`
                font-weight: 500;
                font-size: 12px;
                color: ${ThemingVariables.colors.text[1]};
                margin-top: 12px;
                margin-bottom: 4px;
              `}
            >
              Name
            </div>
            <FormInput value={activeMetric?.name || ''} disabled={true} />
            {activeMetric && 'func' in activeMetric && (
              <div
                className={css`
                  margin-top: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                `}
              >
                <span
                  className={css`
                    font-weight: 500;
                    font-size: 12px;
                    line-height: 15px;
                    color: ${ThemingVariables.colors.text[1]};
                  `}
                >
                  Calculation
                </span>
                <span
                  className={css`
                    font-size: 12px;
                    line-height: 14px;
                    color: ${ThemingVariables.colors.text[0]};
                  `}
                >
                  {activeMetric.func}
                </span>
              </div>
            )}
            {activeMetric && 'fieldName' in activeMetric && (
              <div
                className={css`
                  margin-top: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                `}
              >
                <span
                  className={css`
                    font-weight: 500;
                    font-size: 12px;
                    line-height: 15px;
                    color: ${ThemingVariables.colors.text[1]};
                  `}
                >
                  Column
                </span>
                <span
                  className={css`
                    font-size: 12px;
                    line-height: 14px;
                    color: ${ThemingVariables.colors.text[0]};
                  `}
                >
                  {activeMetric.fieldName}
                </span>
              </div>
            )}
            {activeMetric && 'rawSql' in activeMetric && (
              <>
                <div
                  className={css`
                    font-weight: 500;
                    font-size: 12px;
                    color: ${ThemingVariables.colors.text[1]};
                    margin-top: 12px;
                    margin-bottom: 4px;
                  `}
                >
                  SQL
                </div>
                <textarea
                  defaultValue={activeMetric.rawSql}
                  disabled={true}
                  className={css`
                    width: 100%;
                    height: 200px;
                    resize: none;
                    border-radius: 8px;
                    border: 1px solid ${ThemingVariables.colors.gray[1]};
                    outline: none;
                    padding: 8px;
                  `}
                />
              </>
            )}
            <FormButton
              variant="danger"
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [activeMetricId]: _removed, ...rest } = props.value
                props.onChange(rest)
                setActiveMetricId(undefined)
              }}
              className={css`
                margin-top: 16px;
                font-weight: normal;
              `}
            >
              Remove
            </FormButton>
          </>
        ) : (
          <MetricConigCreator
            fields={props.fields}
            metrics={props.value}
            onCreate={(ms) => {
              let id: string | undefined
              props.onChange({
                ...props.value,
                ...ms.reduce<{ [id: string]: Metric }>((obj, m) => {
                  id = blockIdGenerator()
                  obj[id] = m
                  return obj
                }, {})
              })
              setActiveMetricId(id)
            }}
          />
        )}
      </PerfectScrollbar>
    </>
  )
}

function getFuncs(type: string, aggregation?: Record<string, Record<string, string>>): string[] {
  return aggregation ? Object.keys(aggregation[type] || {}) : []
}

function MetricConigCreator(props: {
  fields: { name: string; type: string }[]
  metrics: { [id: string]: Metric }
  onCreate(metrics: Metric[]): void
}) {
  const [field, setField] = useState<{ name: string; type?: string }>()
  const [map, setMap] = useState<Record<string, string>>({})
  const array = useMemo(() => Object.entries(map), [map])
  const [sqlName, setSqlName] = useState('')
  const [sql, setSql] = useState('')
  const { data: spec } = useGetProfileSpec()
  const metrics = useMemo(
    () =>
      Object.entries(props.metrics).reduce<Record<string, string>>((obj, [metricId, metric]) => {
        if ('fieldName' in metric) {
          obj[`${metric.fieldName}/${metric.fieldType}/${metric.func}`] = metricId
        }
        return obj
      }, {}),
    [props.metrics]
  )
  useEffect(() => {
    setMap(
      Object.values(props.metrics).reduce<Record<string, string>>((obj, metric) => {
        if ('fieldName' in metric && metric.fieldName === field?.name && metric.fieldType === field.type) {
          obj[metric.func] = `${metric.func}(${metric.fieldName})`
        }
        return obj
      }, {})
    )
  }, [field, props.metrics])

  return (
    <>
      <FormDropdown
        menu={({ onClick }) => (
          <MenuWrapper>
            {props.fields.map((f, index) => (
              <MenuItem
                key={f.name + index}
                title={f.name}
                side={f.type}
                disabled={getFuncs(f.type, spec?.queryBuilderSpec.aggregation).length === 0}
                onClick={() => {
                  onClick()
                  setField(f)
                }}
              />
            ))}
            <MenuItemDivider />
            <MenuItem
              title="Custom SQL metric"
              onClick={() => {
                onClick()
                setField({ name: '' })
              }}
            />
          </MenuWrapper>
        )}
        className={css`
          width: 100%;
          text-align: start;
          margin-top: 16px;
        `}
      >
        {field ? (field.type ? field.name : 'Custom SQL metric') : 'Choose'}
      </FormDropdown>
      {field ? (
        field.type ? (
          <>
            <div
              className={css`
                font-weight: 500;
                font-size: 12px;
                color: ${ThemingVariables.colors.text[1]};
                margin-top: 12px;
                margin-bottom: 4px;
              `}
            >
              Calculations
            </div>
            {getFuncs(field.type, spec?.queryBuilderSpec.aggregation).map((func) => (
              <MetricItem
                key={func}
                disabled={!!metrics[`${field.name}/${field.type}/${func}`]}
                fieldName={field.name}
                func={func}
                value={map[func]}
                onChange={(value) => {
                  setMap(
                    produce((draft) => {
                      if (value === undefined) {
                        delete draft[func]
                      } else {
                        draft[func] = value
                      }
                    })
                  )
                }}
                className={css`
                  margin-top: 8px;
                `}
              />
            ))}
          </>
        ) : (
          <>
            <div
              className={css`
                font-weight: 500;
                font-size: 12px;
                color: ${ThemingVariables.colors.text[1]};
                margin-top: 12px;
                margin-bottom: 4px;
              `}
            >
              Name
            </div>
            <FormInput
              value={sqlName}
              onChange={(e) => {
                setSqlName(e.target.value)
              }}
              className={css`
                margin-top: 8px;
              `}
            />
            <div
              className={css`
                font-weight: 500;
                font-size: 12px;
                color: ${ThemingVariables.colors.text[1]};
                margin-top: 12px;
                margin-bottom: 4px;
              `}
            >
              SQL
            </div>
            <textarea
              value={sql}
              onChange={(e) => {
                setSql(e.target.value)
              }}
              className={css`
                margin-top: 8px;
                width: 100%;
                height: 200px;
                resize: none;
                border-radius: 8px;
                border: 1px solid ${ThemingVariables.colors.gray[1]};
                outline: none;
                padding: 8px;
                :active,
                :focus {
                  border: 1px solid ${ThemingVariables.colors.primary[1]};
                }
              `}
            />
          </>
        )
      ) : null}
      <FormButton
        variant="primary"
        disabled={!field || (field.type && array.length === 0) || (!field.type && (!sqlName || !sql))}
        onClick={() => {
          if (!field) {
            return
          }
          if (field.type) {
            props.onCreate(
              array
                .map(([func, name]) => ({ name, fieldName: field.name, fieldType: field.type!, func }))
                .filter(({ fieldName, fieldType, func }) => !metrics[`${fieldName}/${fieldType}/${func}`])
            )
          } else {
            props.onCreate([{ name: sqlName!, rawSql: sql! }])
          }
        }}
        className={css`
          width: 100%;
          margin-top: 8px;
        `}
      >
        Add all
      </FormButton>
    </>
  )
}

function MetricItem(props: {
  fieldName: string
  disabled: boolean
  func: string
  value?: string
  onChange(value?: string): void
  className?: string
}) {
  return (
    <div className={props.className}>
      <div
        className={css`
          display: flex;
          justify-content: space-between;
        `}
      >
        <div
          className={css`
            font-size: 12px;
            line-height: 14px;
          `}
        >
          {props.func}
        </div>
        <FormSwitch
          disabled={props.disabled}
          checked={typeof props.value !== 'undefined'}
          onChange={(e) => {
            props.onChange(e.target.checked ? `${props.func}(${props.fieldName})` : undefined)
          }}
        />
      </div>
      {typeof props.value === 'undefined' ? null : (
        <FormInput
          placeholder={`${props.func}(${props.fieldName})`}
          onBlur={() => {
            if (typeof props.value === 'string' && props.value.length === 0) {
              props.onChange(`${props.func}(${props.fieldName})`)
            }
          }}
          value={props.value}
          onChange={(e) => {
            props.onChange(e.target.value)
          }}
          className={css`
            margin-top: 10px;
          `}
        />
      )}
    </div>
  )
}
