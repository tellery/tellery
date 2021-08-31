import { IconCommonAdd } from '@app/assets/icons'
import { useGetProfileSpec, useSnapshot } from '@app/hooks/api'
import { useDimensions } from '@app/hooks/useDimensions'
import { ThemingVariables } from '@app/styles'
import { Editor, Metric } from '@app/types'
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

export default function MetricConfig(props: {
  value: Editor.QueryBlock
  onChange(
    fields: {
      name: string
      type: string
    }[],
    metrics: {
      [id: string]: Metric
    }
  ): void
  className?: string
}) {
  const [isQueryBuilder, setIsQueryBuilder] = useState(false)
  useEffect(() => {
    setIsQueryBuilder(props.value.type === Editor.BlockType.QueryBuilder)
  }, [props.value.type])

  if (!isQueryBuilder) {
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
        <FormButton variant="primary" onClick={() => setIsQueryBuilder(true)}>
          Convert as data assets
        </FormButton>
      </div>
    )
  }
  return <MetricConfigInner value={props.value} onChange={props.onChange} className={props.className} />
}

function MetricConfigInner(props: {
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
  className?: string
}) {
  const snapshot = useSnapshot(props.value.content?.snapshotId)
  const [activeMetric, setActiveMetric] = useState<string>()
  const ref = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(ref, 0)
  const [metrics, setMetrics] = useState(props.value.content?.metrics || {})
  useEffect(() => {
    setMetrics(props.value.content?.metrics || {})
  }, [props.value.content?.metrics])
  const fields = useMemo(
    () =>
      snapshot?.data.fields
        .filter((field) => field.sqlType)
        .map((field) => ({ name: field.name, type: field.sqlType! })),
    [snapshot?.data.fields]
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
            {metrics[activeMetric] ? metrics[activeMetric].name : null}
            <FormButton
              variant="danger"
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [activeMetric]: _removed, ...rest } = metrics
                setMetrics(rest)
                setActiveMetric(undefined)
              }}
            >
              Remove
            </FormButton>
          </>
        ) : (
          <MetricConigCreator
            fields={fields}
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
        {snapshot?.data ? (
          <table.Diagram
            dimensions={dimensions}
            config={table.initializeConfig(snapshot.data, {})}
            data={snapshot?.data}
          />
        ) : null}
      </div>
    </div>
  )
}

function getFuncs(type: string, aggregation?: Record<string, Record<string, string>>): string[] {
  return aggregation ? Object.keys(aggregation[type] || {}) : []
}

function MetricConigCreator(props: { fields?: { name: string; type: string }[]; onCreate(metrics: Metric[]): void }) {
  const [field, setField] = useState<{ name: string; type?: string }>()
  const [map, setMap] = useState<Record<string, string>>({})
  const array = useMemo(() => Object.entries(map), [map])
  const [sqlName, setSqlName] = useState('')
  const [sql, setSql] = useState('')
  const { data: spec } = useGetProfileSpec()

  return (
    <>
      <FormDropdown
        menu={({ onClick }) => (
          <MenuWrapper>
            {props.fields?.map((f, index) => (
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
            props.onCreate(array.map(([func, name]) => ({ name, fieldName: field.name, fieldType: field.type!, func })))
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
  func: string
  value?: string
  onChange(value?: string): void
  className?: string
}) {
  return (
    <div className={props.className}>
      <div>
        {props.func}
        <FormSwitch
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
        />
      )}
    </div>
  )
}
