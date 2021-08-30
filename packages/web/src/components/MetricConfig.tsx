import { IconCommonAdd } from '@app/assets/icons'
import { useSnapshot } from '@app/hooks/api'
import { useDimensions } from '@app/hooks/useDimensions'
import { ThemingVariables } from '@app/styles'
import { Editor, Measurement } from '@app/types'
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

export default function MetricConfig(props: { block: Editor.SQLLikeBlock; className?: string }) {
  const [isMetric, setIsMetric] = useState(false)
  useEffect(() => {
    setIsMetric(props.block.type === Editor.BlockType.Metric)
  }, [props.block.type])

  if (!isMetric) {
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
        <FormButton variant="primary" onClick={() => setIsMetric(true)}>
          Convert as data assets
        </FormButton>
      </div>
    )
  }
  return <MetricConfigInner block={props.block} className={props.className} />
}

function MetricConfigInner(props: { block: Editor.MetricBlock; className?: string }) {
  const snapshot = useSnapshot(props.block.content?.snapshotId)
  const [activeMeasurement, setActiveMeasurement] = useState<string>()
  const ref = useRef<HTMLDivElement>(null)
  const dimensions = useDimensions(ref, 0)
  const [measurements, setMeasurements] = useState(props.block.content?.measurements || {})
  useEffect(() => {
    setMeasurements(props.block.content?.measurements || {})
  }, [props.block.content?.measurements])
  const fields = useMemo(
    () =>
      snapshot?.data.fields
        .filter((field) => field.sqlType)
        .map((field) => ({ name: field.name, type: field.sqlType! })),
    [snapshot?.data.fields]
  )

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
        {Object.entries(measurements).map(([id, measurement]) => (
          <div
            key={id}
            onClick={() => {
              setActiveMeasurement(id)
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
              id === activeMeasurement &&
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
                id === activeMeasurement
                  ? css`
                      color: ${ThemingVariables.colors.gray[5]};
                    `
                  : css`
                      color: ${ThemingVariables.colors.text[0]};
                    `
              )}
            >
              {measurement.name}
            </span>
          </div>
        ))}
        <FormButton
          variant={activeMeasurement ? 'secondary' : 'primary'}
          onClick={() => {
            setActiveMeasurement(undefined)
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
        {activeMeasurement ? (
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
            {measurements[activeMeasurement] ? measurements[activeMeasurement].name : null}
            <FormButton
              variant="danger"
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [activeMeasurement]: _removed, ...rest } = measurements
                setMeasurements(rest)
                setActiveMeasurement(undefined)
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
              setMeasurements({
                ...measurements,
                ...ms.reduce<{ [id: string]: Measurement }>((obj, m) => {
                  id = blockIdGenerator()
                  obj[id] = m
                  return obj
                }, {})
              })
              setActiveMeasurement(id)
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

function getFuncs(type: string) {
  return ['CHAR', 'VARCHAR', 'LONGVARCHAR', 'DATE', 'TIME', 'TIMESTAMP'].includes(type)
    ? ['count', 'countDistinct']
    : ['TINYINT', 'SMALLINT', 'INTEGER', 'FLOAT', 'REAL', 'DOUBLE', 'NUMERIC', 'DECIMAL'].includes(type)
    ? ['sum', 'avg', 'min', 'max', 'median', 'std']
    : []
}

function MetricConigCreator(props: {
  fields?: { name: string; type: string }[]
  onCreate(measurements: Measurement[]): void
}) {
  const [field, setField] = useState<{ name: string; type?: string }>()
  const [map, setMap] = useState<Record<string, string>>({})
  const array = useMemo(() => Object.entries(map), [map])
  const [sqlName, setSqlName] = useState('')
  const [sql, setSql] = useState('')

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
                disabled={getFuncs(f.type).length === 0}
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
          getFuncs(field.type).map((func) => (
            <MeasurementItem
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

function MeasurementItem(props: {
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
