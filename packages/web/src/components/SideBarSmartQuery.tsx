import {
  IconCommonAdd,
  IconCommonArrowLeft,
  IconCommonDataAsset,
  IconCommonDataTypeBool,
  IconCommonDataTypeInt,
  IconCommonDataTypeString,
  IconCommonDataTypeTime,
  IconCommonSub
} from '@app/assets/icons'
import { setBlockTranscation } from '@app/context/editorTranscations'
import { useBlockSuspense, useGetProfileSpec, useQuerySnapshot } from '@app/hooks/api'
import { useCommit } from '@app/hooks/useCommit'
import { useRefreshSnapshot } from '@app/hooks/useStorySnapshotManager'
import { ThemingVariables } from '@app/styles'
import { Dimension, Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import produce from 'immer'
import { WritableDraft } from 'immer/dist/internal'
import { lowerCase, uniq, uniqBy } from 'lodash'
import React, { ReactNode, useCallback, useEffect, useState } from 'react'
import FilterCard from './FilterCard'
import FilterPopover from './FilterPopover'
import { MenuItem } from './MenuItem'
import { MenuWrapper } from './MenuWrapper'
import ConfigIconButton from './v11n/components/ConfigIconButton'
import { ConfigSection } from './v11n/components/ConfigSection'
import { SQLTypeReduced } from './v11n/types'

export default function SideBarSmartQuery(props: { storyId: string; blockId: string }) {
  const block = useBlockSuspense<Editor.VisualizationBlock>(props.blockId)
  const smartQueryBlock = useBlockSuspense<Editor.SmartQueryBlock>(block.content?.queryId!)
  const queryBuilderBlock = useBlockSuspense<Editor.QueryBuilder>(smartQueryBlock.content?.queryBuilderId)

  const commit = useCommit()
  const mutateSnapshot = useRefreshSnapshot(props.storyId)
  const setSmartQueryBlock = useCallback(
    (update: (block: WritableDraft<Editor.SmartQueryBlock>) => void) => {
      const oldBlock = smartQueryBlock
      const newBlock = produce(oldBlock, update)
      commit({ transcation: setBlockTranscation({ oldBlock, newBlock }), storyId: props.storyId }).then(() => {
        mutateSnapshot.execute(newBlock)
      })
    },
    [smartQueryBlock, mutateSnapshot, commit, props.storyId]
  )

  if (!queryBuilderBlock) {
    return null
  }

  return (
    <SmartQueryConfig
      queryBuilderBlock={queryBuilderBlock}
      metricIds={smartQueryBlock.content.metricIds}
      dimensions={smartQueryBlock.content.dimensions}
      filters={smartQueryBlock.content.filters}
      onChange={setSmartQueryBlock}
    />
  )
}

export const SmartQueryConfig: React.FC<{
  queryBuilderBlock: Editor.QueryBuilder
  metricIds: string[]
  dimensions: Dimension[]
  filters?: Editor.FilterBuilder
  onChange: (update: (block: WritableDraft<Editor.SmartQueryBlock>) => void) => void
}> = ({ queryBuilderBlock, metricIds, dimensions, filters, onChange }) => {
  const { data: spec } = useGetProfileSpec()
  const [metricVisible, setMetricVisible] = useState(false)
  const [dimensionVisible, setDimensionVisible] = useState(false)
  const [filtersVisible, setFiltersVisible] = useState(false)
  const snapshot = useQuerySnapshot(queryBuilderBlock.id)
  const fields = snapshot?.data.fields || []
  const [filter, setFilter] = useState(filters)
  useEffect(() => {
    setFilter(filters)
  }, [filters])

  if (!snapshot) {
    return null
  }
  return (
    <>
      <ConfigSection
        title="Measures"
        right={
          Object.keys(queryBuilderBlock.content?.metrics || {}).length === 0 ? null : (
            <Tippy
              visible={metricVisible}
              onClickOutside={() => {
                setMetricVisible(false)
              }}
              interactive={true}
              placement="left-start"
              theme="tellery"
              arrow={false}
              offset={[0, 0]}
              appendTo={document.body}
              content={
                <MenuWrapper>
                  {Object.entries(queryBuilderBlock.content?.metrics || {}).map(([metricId, metric]) => (
                    <MenuItem
                      key={metricId}
                      title={metric.name}
                      disabled={metric.deprecated || metricIds.includes(metricId)}
                      onClick={() => {
                        onChange((draft) => {
                          draft.content.metricIds = uniq([...metricIds, metricId])
                        })
                        setMetricVisible(false)
                      }}
                    />
                  ))}
                </MenuWrapper>
              }
              className={css`
                width: 100%;
                text-align: start;
                margin-top: 8px;
              `}
            >
              <ConfigIconButton
                icon={IconCommonAdd}
                onClick={() => {
                  setMetricVisible((old) => !old)
                }}
              />
            </Tippy>
          )
        }
      >
        {metricIds.length
          ? metricIds.map((metricId, index) =>
              queryBuilderBlock.content?.metrics?.[metricId] ? (
                <ConfigItem
                  key={metricId}
                  onClick={() => {
                    onChange((draft) => {
                      draft.content.metricIds = metricIds.filter((_m, i) => i !== index)
                    })
                  }}
                  className={css`
                    margin-top: 8px;
                  `}
                >
                  {queryBuilderBlock.content.metrics[metricId].name}
                </ConfigItem>
              ) : (
                <ConfigItem
                  key={metricId}
                  onClick={() => {
                    onChange((draft) => {
                      draft.content.metricIds = metricIds.filter((_m, i) => i !== index)
                    })
                  }}
                  className={css`
                    margin-top: 8px;
                  `}
                >
                  {metricId}
                </ConfigItem>
              )
            )
          : null}
      </ConfigSection>
      <ConfigSection
        title="Dimensions"
        right={
          fields.length === 0 ? null : (
            <Tippy
              visible={dimensionVisible}
              onClickOutside={() => {
                setDimensionVisible(false)
              }}
              interactive={true}
              placement="left-start"
              theme="tellery"
              arrow={false}
              offset={[0, 0]}
              appendTo={document.body}
              content={
                <MenuWrapper>
                  {fields.map((field, index) =>
                    field.sqlType &&
                    spec?.queryBuilderSpec.bucketization[field.sqlType] &&
                    Object.keys(spec.queryBuilderSpec.bucketization[field.sqlType]).length ? (
                      <Tippy
                        theme="tellery"
                        placement="left-start"
                        arrow={false}
                        interactive={true}
                        offset={[-12, 10]}
                        content={
                          <MenuWrapper>
                            {Object.keys(spec.queryBuilderSpec.bucketization[field.sqlType]).map((func) => (
                              <MenuItem
                                key={func}
                                title={lowerCase(func)}
                                icon={
                                  field.sqlType ? (
                                    {
                                      OTHER: <IconCommonDataAsset color={ThemingVariables.colors.gray[0]} />,
                                      BOOL: <IconCommonDataTypeBool color={ThemingVariables.colors.gray[0]} />,
                                      NUMBER: <IconCommonDataTypeInt color={ThemingVariables.colors.gray[0]} />,
                                      DATE: <IconCommonDataTypeTime color={ThemingVariables.colors.gray[0]} />,
                                      STRING: <IconCommonDataTypeString color={ThemingVariables.colors.gray[0]} />
                                    }[SQLTypeReduced[field.sqlType]]
                                  ) : (
                                    <IconCommonDataAsset color={ThemingVariables.colors.gray[0]} />
                                  )
                                }
                                disabled={
                                  !!dimensions.find(
                                    (dimension) =>
                                      dimension.fieldName === field.name &&
                                      dimension.fieldType === field.sqlType &&
                                      dimension.func === func
                                  )
                                }
                                onClick={() => {
                                  onChange((draft) => {
                                    draft.content.dimensions = uniqBy(
                                      [
                                        ...dimensions,
                                        {
                                          name: `${field.name} ${lowerCase(func)}`,
                                          fieldName: field.name,
                                          fieldType: field.sqlType!,
                                          func
                                        }
                                      ],
                                      (dimension) => `${dimension.name}${dimension.fieldType}${dimension.func}`
                                    )
                                  })
                                  setDimensionVisible(false)
                                }}
                              />
                            ))}
                          </MenuWrapper>
                        }
                      >
                        <MenuItem
                          key={field.name + index}
                          title={field.name}
                          icon={<IconCommonArrowLeft color={ThemingVariables.colors.gray[0]} />}
                        />
                      </Tippy>
                    ) : field.sqlType && spec?.queryBuilderSpec.bucketization[field.sqlType] ? (
                      <MenuItem
                        key={field.name + index}
                        title={field.name}
                        icon={
                          {
                            OTHER: <IconCommonDataAsset color={ThemingVariables.colors.gray[0]} />,
                            BOOL: <IconCommonDataTypeBool color={ThemingVariables.colors.gray[0]} />,
                            NUMBER: <IconCommonDataTypeInt color={ThemingVariables.colors.gray[0]} />,
                            DATE: <IconCommonDataTypeTime color={ThemingVariables.colors.gray[0]} />,
                            STRING: <IconCommonDataTypeString color={ThemingVariables.colors.gray[0]} />
                          }[SQLTypeReduced[field.sqlType]]
                        }
                        disabled={
                          !!dimensions.find(
                            (dimension) => dimension.fieldName === field.name && dimension.fieldType === field.sqlType
                          )
                        }
                        onClick={() => {
                          onChange((draft) => {
                            draft.content.dimensions = uniqBy(
                              [
                                ...dimensions,
                                {
                                  name: field.name,
                                  fieldName: field.name,
                                  fieldType: field.sqlType!
                                }
                              ],
                              (dimension) => `${dimension.name}${dimension.fieldType}${dimension.func}`
                            )
                          })
                          setDimensionVisible(false)
                        }}
                      />
                    ) : null
                  )}
                </MenuWrapper>
              }
              className={css`
                width: 100%;
                text-align: start;
                margin-top: 8px;
              `}
            >
              <ConfigIconButton
                icon={IconCommonAdd}
                onClick={() => {
                  setDimensionVisible((old) => !old)
                }}
              />
            </Tippy>
          )
        }
      >
        {dimensions.length
          ? dimensions.map((dimension, index) => (
              <ConfigItem
                key={dimension.name + index}
                onClick={() => {
                  onChange((draft) => {
                    draft.content.dimensions = dimensions.filter((_d, i) => i !== index)
                  })
                }}
                icon={
                  {
                    OTHER: <IconCommonDataAsset color={ThemingVariables.colors.gray[0]} />,
                    BOOL: <IconCommonDataTypeBool color={ThemingVariables.colors.gray[0]} />,
                    NUMBER: <IconCommonDataTypeInt color={ThemingVariables.colors.gray[0]} />,
                    DATE: <IconCommonDataTypeTime color={ThemingVariables.colors.gray[0]} />,
                    STRING: <IconCommonDataTypeString color={ThemingVariables.colors.gray[0]} />
                  }[SQLTypeReduced[dimension.fieldType]]
                }
                className={css`
                  margin-top: 8px;
                `}
              >
                {dimension.name}
              </ConfigItem>
            ))
          : null}
      </ConfigSection>
      <ConfigSection
        title="Filters"
        right={
          <Tippy
            visible={filtersVisible}
            // onClickOutside={() => {
            //   setFiltersVisible(false)
            // }}
            interactive={true}
            placement="left-start"
            theme="tellery"
            arrow={false}
            offset={[0, 160]}
            appendTo={document.body}
            content={
              <FilterPopover
                fields={fields}
                value={
                  filter || {
                    operands: [],
                    operator: 'and'
                  }
                }
                onChange={setFilter}
                onClose={() => {
                  onChange((draft) => {
                    draft.content.filters = filter
                  })
                  setFiltersVisible(false)
                }}
              />
            }
            className={css`
              width: 100%;
              text-align: start;
              margin-top: 8px;
            `}
          >
            <div>
              <ConfigIconButton
                icon={IconCommonAdd}
                disabled={!!filter}
                onClick={() => {
                  setFiltersVisible((old) => !old)
                }}
              />
            </div>
          </Tippy>
        }
      >
        {filter ? (
          <FilterCard
            value={filter}
            onEdit={() => {
              setFiltersVisible(true)
            }}
            onDelete={() => {
              onChange((draft) => {
                delete draft.content.filters
              })
            }}
          />
        ) : null}
      </ConfigSection>
    </>
  )
}

function ConfigItem(props: { icon?: ReactNode; children: ReactNode; onClick(): void; className?: string }) {
  return (
    <div
      className={cx(
        css`
          height: 32px;
          display: flex;
          align-items: center;
          padding-left: 6px;
        `,
        props.className
      )}
    >
      {props.icon}
      <span
        className={css`
          font-style: normal;
          font-weight: normal;
          font-size: 12px;
          line-height: 14px;
          color: ${ThemingVariables.colors.text[0]};
          margin-left: ${props.icon ? 10 : 0}px;
        `}
      >
        {props.children}
      </span>
      <div
        className={css`
          flex: 1;
        `}
      ></div>
      <ConfigIconButton
        icon={IconCommonSub}
        onClick={props.onClick}
        className={css`
          margin-left: 4px;
        `}
      />
    </div>
  )
}
