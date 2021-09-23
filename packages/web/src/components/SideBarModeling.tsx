import { IconCommonAdd, IconCommonSub } from '@app/assets/icons'
import { setBlockTranscation } from '@app/context/editorTranscations'
import { useBlockSuspense, useGetProfileSpec, useQuerySnapshot, useQuestionDownstreams } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { ThemingVariables } from '@app/styles'
import { Editor, Metric } from '@app/types'
import { blockIdGenerator } from '@app/utils'
import { css, cx } from '@emotion/css'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckBox } from './CheckBox'
import { FormButton } from './kit/FormButton'
import QuestionDownstreams from './QuestionDownstreams'
import ConfigIconButton from './v11n/components/ConfigIconButton'
import { ConfigInput } from './v11n/components/ConfigInput'
import { ConfigItem } from './v11n/components/ConfigItem'
import { ConfigPopoverWithTabs } from './v11n/components/ConfigPopoverWithTabs'
import { ConfigSection } from './v11n/components/ConfigSection'
import { ConfigSelect } from './v11n/components/ConfigSelect'

export default function SideBarModeling(props: { storyId: string; blockId: string }) {
  const block = useBlockSuspense<Editor.VisualizationBlock>(props.blockId)
  const queryBlock = useBlockSuspense<Editor.QueryBlock>(block.content?.queryId!)
  const snapshot = useQuerySnapshot(props.storyId, queryBlock.id)
  const commit = useCommit()
  const setBlock = useCallback(
    (update: (block: WritableDraft<Editor.QueryBuilder>) => void) => {
      const oldBlock = queryBlock
      const newBlock = produce(oldBlock, update)
      commit({ transcation: setBlockTranscation({ oldBlock, newBlock }), storyId: props.storyId })
    },
    [queryBlock, commit, props.storyId]
  )
  const fields = useMemo(
    () =>
      snapshot?.data.fields
        .filter((field) => field.sqlType)
        .map((field) => ({ name: field.name, type: field.sqlType! })),
    [snapshot?.data.fields]
  )
  const metrics =
    queryBlock.type === Editor.BlockType.QueryBuilder ? (queryBlock as Editor.QueryBuilder).content?.metrics || {} : {}
  const { data: downstreams } = useQuestionDownstreams(queryBlock?.id)

  return (
    <>
      {queryBlock.type === Editor.BlockType.QueryBuilder ? (
        <ConfigSection
          title="Metrics"
          border={false}
          right={
            <ConfigPopoverWithTabs
              tabs={['Aggregated metric', 'Custom SQL metric']}
              content={[
                ({ onClose }) => (
                  <ConfigSection>
                    {fields ? (
                      <MetricConfigCreator
                        fields={fields}
                        metrics={metrics}
                        onCreate={(ms) => {
                          setBlock((draft) => {
                            if (draft.content) {
                              draft.content.metrics = {
                                ...metrics,
                                ...ms.reduce<{ [id: string]: Metric }>((obj, m) => {
                                  const id = blockIdGenerator()
                                  obj[id] = m
                                  return obj
                                }, {})
                              }
                            }
                          })
                          onClose()
                        }}
                      />
                    ) : null}
                  </ConfigSection>
                ),
                ({ onClose }) => (
                  <ConfigSection>
                    {fields ? (
                      <MetricSQLCreator
                        onCreate={(ms) => {
                          setBlock((draft) => {
                            if (draft.content) {
                              draft.content.metrics = {
                                ...metrics,
                                ...ms.reduce<{ [id: string]: Metric }>((obj, m) => {
                                  const id = blockIdGenerator()
                                  obj[id] = m
                                  return obj
                                }, {})
                              }
                            }
                          })
                          onClose()
                        }}
                      />
                    ) : null}
                  </ConfigSection>
                )
              ]}
            >
              <ConfigIconButton icon={IconCommonAdd} />
            </ConfigPopoverWithTabs>
          }
        >
          {Object.entries(metrics).map(([metricId, metric]) => (
            <MetricItem
              key={metricId}
              name={metric.name}
              onChangeName={(name) => {
                setBlock((draft) => {
                  if (draft.content?.metrics?.[metricId]) {
                    draft.content.metrics[metricId].name = name
                  }
                })
              }}
              onRemove={() => {
                setBlock((draft) => {
                  if (draft.content?.metrics) {
                    delete draft.content.metrics[metricId]
                  }
                })
              }}
            />
          ))}
        </ConfigSection>
      ) : (
        <ConfigSection border={false}>
          <div
            className={css`
              padding: 0 6px;
            `}
          >
            <p
              className={css`
                margin-bottom: 16px;
                font-style: normal;
                font-weight: normal;
                font-size: 12px;
                line-height: 14px;
                text-align: justify;
                color: ${ThemingVariables.colors.text[1]};
              `}
            >
              Data assets let you define metrics on modeled data and anyone can explore them with just a few clicks.
            </p>
            <FormButton
              variant="secondary"
              onClick={() => {
                setBlock((draft) => {
                  draft.type = Editor.BlockType.QueryBuilder
                })
              }}
              disabled={!snapshot}
              className={css`
                width: 100%;
              `}
            >
              Create as data asset
            </FormButton>
          </div>
        </ConfigSection>
      )}
      {downstreams.length ? (
        <ConfigSection title={`Downstreams (${downstreams.length})`}>
          <QuestionDownstreams blockId={queryBlock.id} storyId={props.storyId} />
        </ConfigSection>
      ) : null}
    </>
  )
}

function getFuncs(type: string, aggregation?: Record<string, Record<string, string>>): string[] {
  return aggregation ? Object.keys(aggregation[type] || {}) : []
}

function MetricItem(props: { name: string; onChangeName(name: string): void; onRemove(): void }) {
  const [value, setValue] = useState('')
  useEffect(() => {
    setValue(props.name)
  }, [props.name])

  return (
    <div
      className={css`
        height: 32px;
        display: flex;
        align-items: center;
      `}
    >
      <ConfigInput
        value={value}
        onChange={setValue}
        onBlur={() => {
          props.onChangeName(value)
        }}
        className={css`
          flex: 1;
          font-style: normal;
          font-weight: normal;
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[0]};
        `}
      />
      <ConfigIconButton
        icon={IconCommonSub}
        onClick={props.onRemove}
        className={css`
          flex-shrink: 0;
        `}
      />
    </div>
  )
}

function MetricConfigCreator(props: {
  fields: { name: string; type: string }[]
  metrics: { [id: string]: Metric }
  onCreate(metrics: Metric[]): void
}) {
  const [field, setField] = useState<{ name: string; type: string }>()
  const [map, setMap] = useState<Record<string, string>>({})
  const array = useMemo(() => Object.entries(map), [map])
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
  useEffect(() => {
    setField(props.fields[0])
  }, [props.fields])

  return (
    <>
      <ConfigItem label="Column">
        <ConfigSelect
          options={props.fields.map(({ name }) => name)}
          disables={props.fields
            .filter((f) => getFuncs(f.type, spec?.queryBuilderSpec.aggregation).length === 0)
            .map(({ name }) => name)}
          value={field?.name || ''}
          onChange={(name) => {
            setField(props.fields.find((f) => f.name === name))
          }}
        />
      </ConfigItem>
      {field ? (
        <>
          <Divider half={true} />
          <ConfigItem label="Calculations">null</ConfigItem>
          {getFuncs(field.type, spec?.queryBuilderSpec.aggregation).map((func) => (
            <CalculationItem
              key={func}
              disabled={!!metrics[`${field.name}/${field.type}/${func}`]}
              fieldName={field.name}
              func={func}
              value={map[func]}
              onChange={(value) => {
                setMap(
                  produce((draft) => {
                    if (value) {
                      draft[func] = value
                    } else {
                      delete draft[func]
                    }
                  })
                )
              }}
            />
          ))}
        </>
      ) : null}
      <Divider />
      <FormButton
        variant="secondary"
        disabled={!field || array.length === 0}
        onClick={() => {
          if (!field) {
            return
          }
          props.onCreate(
            array
              .map(([func, name]) => ({ name, fieldName: field.name, fieldType: field.type!, func }))
              .filter(({ fieldName, fieldType, func }) => !metrics[`${fieldName}/${fieldType}/${func}`])
          )
          setField(props.fields[0])
          setMap({})
        }}
        className={css`
          width: 100%;
          margin-top: 0;
        `}
      >
        Add to metrics
      </FormButton>
    </>
  )
}

function MetricSQLCreator(props: { onCreate(metrics: Metric[]): void }) {
  const [name, setName] = useState('')
  const [rawSql, setRawSql] = useState('')

  return (
    <>
      <ConfigItem label="Metric name">
        <ConfigInput value={name} onChange={setName} />
      </ConfigItem>
      <Divider half={true} />
      <ConfigItem label="SQL">null</ConfigItem>
      <textarea
        value={rawSql}
        onChange={(e) => {
          setRawSql(e.target.value)
        }}
        spellCheck="false"
        autoComplete="off"
        className={css`
          height: 160px;
          width: 100%;
          resize: none;
          border: none;
          outline: none;
          background: ${ThemingVariables.colors.gray[3]};
          border-radius: 4px;
          padding: 8px;
          margin-bottom: -3px;
        `}
      />
      <Divider />
      <FormButton
        variant="secondary"
        disabled={!name || !rawSql}
        onClick={() => {
          props.onCreate([{ name, rawSql }])
          setName('')
          setRawSql('')
        }}
        className={css`
          width: 100%;
          margin-top: 0;
        `}
      >
        Add to metrics
      </FormButton>
    </>
  )
}

function CalculationItem(props: {
  fieldName: string
  disabled: boolean
  func: string
  value: string
  onChange(value: string): void
  className?: string
}) {
  return (
    <ConfigItem
      label={
        <div
          className={css`
            display: flex;
            align-items: center;
          `}
        >
          <CheckBox
            disabled={props.disabled}
            value={!!props.value}
            onChange={(v) => {
              props.onChange(v ? `${props.func}(${props.fieldName})` : '')
            }}
          />
          <div
            className={css`
              font-size: 12px;
              line-height: 14px;
              color: ${ThemingVariables.colors.text[0]};
              margin-left: 10px;
            `}
          >
            {props.func}
          </div>
        </div>
      }
    >
      <ConfigInput
        placeholder={`${props.func}(${props.fieldName})`}
        value={props.value || ''}
        onChange={props.onChange}
      />
    </ConfigItem>
  )
}

function Divider(props: { half?: boolean }) {
  return (
    <div
      className={cx(
        css`
          border-top: 1px solid ${ThemingVariables.colors.gray[1]};
        `,
        props.half
          ? css`
              margin: 8px -10px 8px 0 !important;
            `
          : css`
              margin: 8px -10px !important;
            `
      )}
    />
  )
}
