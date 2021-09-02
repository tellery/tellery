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
  value: Editor.QueryBlock
  onChange(fields: { name: string; type: string }[], metrics: { [id: string]: Metric }): void
  className?: string
}) {
  const [isQueryBuilder, setIsQueryBuilder] = useState(false)
  useEffect(() => {
    setIsQueryBuilder(props.value.type === Editor.BlockType.QueryBuilder)
  }, [props.value.type])
  const snapshot = useSnapshot(props.value.content?.snapshotId)

  if (!isQueryBuilder || !snapshot) {
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
              Convert as data assets
            </FormButton>
          </div>
        </Tippy>
      </div>
    )
  }
  return (
    <QueryBuilderConfigInner
      value={props.value}
      onChange={props.onChange}
      snapshot={snapshot}
      className={props.className}
    />
  )
}

function QueryBuilderConfigInner(props: {
  value: Editor.QueryBuilder
  onChange(
    fields: {
      name: string
      type: string
    }[],
    metrics: {
      [id: string]: Metric
    }
  ): void
  snapshot: Snapshot
  className?: string
}) {
  const [activeMetric, setActiveMetric] = useState<string>()
  const ref = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(ref, 0)
  const [metrics, setMetrics] = useState(props.value.content?.metrics || {})
  useEffect(() => {
    setMetrics(props.value.content?.metrics || {})
  }, [props.value.content?.metrics])
  const fields = useMemo(
    () =>
      props.snapshot.data.fields
        .filter((field) => field.sqlType)
        .map((field) => ({ name: field.name, type: field.sqlType! })),
    [props.snapshot.data.fields]
  )
  const { onChange } = props
  useEffect(() => {
    if (fields) {
      onChange(fields, metrics)
    }
  }, [fields, metrics, onChange])

  return (
    <div
      className={cx(
        css`
          display: flex;
        `,
        props.className
      )}
    >
      <div
        className={css`
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 0 20px;
        `}
      >
        {Object.entries(metrics).map(([id, metric]) => (
          <div
            key={id}
            onClick={() => {
              setActiveMetric(id)
            }}
            className={cx(
              css`
                height: 36px;
                border-radius: 8px;
                margin-top: 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                cursor: pointer;
              `,
              id === activeMetric &&
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
                id === activeMetric
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
        <FormButton
          variant={activeMetric ? 'secondary' : 'primary'}
          onClick={() => {
            setActiveMetric(undefined)
          }}
          className={css`
            width: 100%;
            padding: 8px 0;
            margin-top: 20px;
          `}
        >
          <IconCommonAdd />
        </FormButton>
      </div>
      <PerfectScrollbar
        options={{ suppressScrollX: true }}
        className={css`
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 20px;
        `}
      >
        {activeMetric ? (
          <>
            <div
              className={css`
                font-weight: 500;
                font-size: 12px;
                color: ${ThemingVariables.colors.text[1]};
                margin-top: 5px;
              `}
            >
              Name
            </div>
            <div>{metrics[activeMetric] ? metrics[activeMetric].name : null}</div>
            <FormButton
              variant="danger"
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [activeMetric]: _removed, ...rest } = metrics
                setMetrics(rest)
                setActiveMetric(undefined)
              }}
              className={css`
                margin-top: 20px;
              `}
            >
              Remove
            </FormButton>
          </>
        ) : (
          <MetricConigCreator
            fields={fields}
            metrics={metrics}
            onCreate={(ms) => {
              let id: string | undefined
              setMetrics({
                ...metrics,
                ...ms.reduce<{ [id: string]: Metric }>((obj, m) => {
                  id = blockIdGenerator()
                  obj[id] = m
                  return obj
                }, {})
              })
              setActiveMetric(id)
            }}
          />
        )}
      </PerfectScrollbar>
      <div
        ref={ref}
        className={css`
          height: 100%;
          width: 0;
          flex: 1;
          padding: 20px;
        `}
      >
        <table.Diagram
          dimensions={dimensions}
          config={table.initializeConfig(props.snapshot.data, {})}
          data={props.snapshot.data}
        />
      </div>
    </div>
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
              title="Raw SQL"
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
        `}
      >
        {field ? (field.type ? field.name : 'Raw SQL') : 'Choose'}
      </FormDropdown>
      {field ? (
        field.type ? (
          getFuncs(field.type, spec?.queryBuilderSpec.aggregation).map((func) => (
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
                margin-top: 20px;
              `}
            />
          ))
        ) : (
          <>
            <FormInput
              value={sqlName}
              onChange={(e) => {
                setSqlName(e.target.value)
              }}
              className={css`
                margin-top: 20px;
              `}
            />
            <textarea
              value={sql}
              onChange={(e) => {
                setSql(e.target.value)
              }}
              className={css`
                margin-top: 20px;
                width: 100%;
                height: 200px;
                resize: none;
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
          margin-top: 20px;
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
        {props.func}
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
