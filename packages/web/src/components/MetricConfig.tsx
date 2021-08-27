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
import FormInput from './kit/FormInput'
import { MenuItem } from './MenuItem'
import { MenuItemDivider } from './MenuItemDivider'
import { MenuWrapper } from './MenuWrapper'
import { table } from './v11n/charts/table'
import produce from 'immer'
import PerfectScrollbar from 'react-perfect-scrollbar'
import Tippy from '@tippyjs/react'

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
  const [isAddMode, setIsAddMode] = useState(false)
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
          variant="secondary"
          onClick={() => {
            setIsAddMode(true)
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
        {isAddMode ? (
          <MetricConigCreator
            fields={fields}
            onCreate={(ms) => {
              setMeasurements({
                ...measurements,
                ...ms.reduce<{ [id: string]: Measurement }>((obj, m) => {
                  obj[blockIdGenerator()] = m
                  return obj
                }, {})
              })
            }}
          />
        ) : (
          <>
            <span
              className={css`
                font-weight: 500;
                font-size: 12px;
                color: ${ThemingVariables.colors.text[1]};
                margin-top: 5px;
              `}
            >
              Name
            </span>
          </>
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
    : ['TINYINT', 'SMALLINT', 'INTEGER', 'FLOAT', 'REAL', 'DOUBLD', 'NUMERIC', 'DECIMAL'].includes(type)
    ? ['sum', 'avg', 'min', 'max', 'median', 'std']
    : []
}

function MetricConigCreator(props: {
  fields?: { name: string; type: string }[]
  onCreate(measurements: Measurement[]): void
}) {
  const [measurements, setMeasurements] = useState<Measurement[]>([])

  return (
    <>
      {measurements.map((measurement, index) => (
        <MeasurementItem
          key={measurement.name + index}
          value={measurement}
          onChange={(m) => {
            setMeasurements(
              produce((draft) => {
                draft[index] = m
              })
            )
          }}
          className={css`
            margin-bottom: 20px;
          `}
        />
      ))}
      <FormDropdown
        menu={({ onClick }) => (
          <MenuWrapper>
            {props.fields?.map((field, index) => (
              <Tippy
                key={field.name + index}
                content={
                  <MenuWrapper>
                    {getFuncs(field.type).map((func) => (
                      <MenuItem
                        key={func}
                        title={func}
                        onClick={() => {
                          onClick()
                          setMeasurements((old) => [
                            ...old,
                            { name: `${func} ${field.name}`, fieldType: field.type, fieldName: field.name, func }
                          ])
                        }}
                      />
                    ))}
                  </MenuWrapper>
                }
                theme="tellery"
                arrow={false}
                placement="right-start"
                duration={0}
                offset={[-10, 10]}
                interactive={true}
              >
                <MenuItem title={field.name} side={field.type} />
              </Tippy>
            ))}
            <MenuItemDivider />
            <MenuItem
              title="Raw SQL"
              onClick={() => {
                onClick()
                setMeasurements((old) => [...old, { name: '', rawSql: '' }])
              }}
            />
          </MenuWrapper>
        )}
        className={css`
          width: 100%;
          text-align: start;
        `}
      >
        Choose
      </FormDropdown>
      <FormButton
        variant="primary"
        disabled={true}
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

function MeasurementItem(props: { value: Measurement; onChange(value: Measurement): void; className?: string }) {
  return (
    <div className={props.className}>
      <span
        className={css`
          color: ${ThemingVariables.colors.text[1]};
        `}
      >
        Name
      </span>
      <FormInput
        value={props.value.name}
        onChange={(e) => {
          props.onChange({ ...props.value, name: e.target.value })
        }}
      />
    </div>
  )
}
