import { IconCommonAdd, IconCommonClose } from '@app/assets/icons'
import { useBlock, useGetProfileSpec, useSnapshot } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Dimension, Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { lowerCase, uniq, uniqBy } from 'lodash'
import { ReactNode, useState } from 'react'
import FormDropdown from './kit/FormDropdown'
import { MenuItem } from './MenuItem'
import { MenuWrapper } from './MenuWrapper'

export default function SmartQueryConfig(props: {
  queryBuilderId: string
  metricIds: string[]
  dimensions: Dimension[]
  onChange(metricIds?: string[], dimensions?: Dimension[]): void
  className?: string
}) {
  const { data: queryBuilderBlock } = useBlock<Editor.QueryBuilder>(props.queryBuilderId)
  const snapshot = useSnapshot(queryBuilderBlock?.content?.snapshotId)
  const { data: spec } = useGetProfileSpec()
  const [metricVisible, setMetricVisible] = useState(false)
  const [dimensionVisible, setDimensionVisible] = useState(false)

  if (!queryBuilderBlock || !snapshot) {
    return null
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
      <div
        className={css`
          width: 280px;
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
            trigger="click"
            content={
              <MenuWrapper>
                {Object.entries(queryBuilderBlock.content?.metrics || {}).map(([metricId, metric]) => (
                  <MenuItem
                    key={metricId}
                    title={metric.name}
                    disabled={metric.deprecated || props.metricIds.includes(metricId)}
                    onClick={() => {
                      props.onChange(uniq([...props.metricIds, metricId]), props.dimensions)
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
            <div>
              <IconCommonAdd
                color={ThemingVariables.colors.text[0]}
                onClick={() => {
                  setMetricVisible((old) => !old)
                }}
                className={css`
                  cursor: pointer;
                `}
              />
            </div>
          </Tippy>
        </div>
        {props.metricIds.map((metricId, index) =>
          queryBuilderBlock.content?.metrics?.[metricId] ? (
            <ConfigItem
              key={metricId}
              onClick={() => {
                props.onChange(
                  props.metricIds.filter((_m, i) => i !== index),
                  props.dimensions
                )
              }}
              className={css`
                margin-top: 8px;
              `}
            >
              {queryBuilderBlock.content.metrics[metricId].name}
            </ConfigItem>
          ) : null
        )}
      </div>
      <div
        className={css`
          width: 280px;
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
            Dimensions
          </h3>
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
            trigger="click"
            content={
              <MenuWrapper>
                {snapshot.data.fields.map((field, index) =>
                  field.sqlType &&
                  spec?.queryBuilderSpec.bucketization[field.sqlType] &&
                  Object.keys(spec.queryBuilderSpec.bucketization[field.sqlType]).length ? (
                    <Tippy
                      theme="tellery"
                      placement="right-start"
                      arrow={false}
                      interactive={true}
                      offset={[-12, 10]}
                      content={
                        <MenuWrapper>
                          {Object.keys(spec.queryBuilderSpec.bucketization[field.sqlType]).map((func) => (
                            <MenuItem
                              key={func}
                              title={func}
                              disabled={
                                !!props.dimensions.find(
                                  (dimension) =>
                                    dimension.fieldName === field.name &&
                                    dimension.fieldType === field.sqlType &&
                                    dimension.func === func
                                )
                              }
                              onClick={() => {
                                props.onChange(
                                  props.metricIds,
                                  uniqBy(
                                    [
                                      ...props.dimensions,
                                      {
                                        name: `${field.name} ${lowerCase(func)}`,
                                        fieldName: field.name,
                                        fieldType: field.sqlType!,
                                        func
                                      }
                                    ],
                                    (dimension) => `${dimension.name}${dimension.fieldType}${dimension.func}`
                                  )
                                )
                                setDimensionVisible(false)
                              }}
                            />
                          ))}
                        </MenuWrapper>
                      }
                    >
                      <MenuItem key={field.name + index} title={field.name} side={`${field.sqlType} >`} />
                    </Tippy>
                  ) : (
                    <MenuItem
                      key={field.name + index}
                      title={field.name}
                      side={field.sqlType}
                      disabled={
                        !!props.dimensions.find(
                          (dimension) => dimension.fieldName === field.name && dimension.fieldType === field.sqlType
                        )
                      }
                      onClick={() => {
                        props.onChange(
                          props.metricIds,
                          uniqBy(
                            [
                              ...props.dimensions,
                              {
                                name: field.name,
                                fieldName: field.name,
                                fieldType: field.sqlType!
                              }
                            ],
                            (dimension) => `${dimension.name}${dimension.fieldType}${dimension.func}`
                          )
                        )
                        setDimensionVisible(false)
                      }}
                    />
                  )
                )}
              </MenuWrapper>
            }
            className={css`
              width: 100%;
              text-align: start;
              margin-top: 8px;
            `}
          >
            <div>
              <IconCommonAdd
                color={ThemingVariables.colors.text[0]}
                onClick={() => {
                  setDimensionVisible((old) => !old)
                }}
                className={css`
                  cursor: pointer;
                `}
              />
            </div>
          </Tippy>
        </div>
        {props.dimensions.map((dimension, index) => (
          <ConfigItem
            key={dimension.name + index}
            onClick={() => {
              props.onChange(
                props.metricIds,
                props.dimensions.filter((_d, i) => i !== index)
              )
            }}
            className={css`
              margin-top: 8px;
            `}
          >
            {dimension.name}
          </ConfigItem>
        ))}
      </div>
    </div>
  )
}

function ConfigItem(props: { children: ReactNode; onClick(): void; className?: string }) {
  return (
    <div
      className={cx(
        css`
          height: 36px;
          font-size: 12px;
          color: ${ThemingVariables.colors.text[0]};
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px 0 16px;
          & > svg {
            opacity: 0;
          }
          &:hover > svg {
            opacity: 1;
          }
        `,
        props.className
      )}
    >
      {props.children}
      <IconCommonClose
        color={ThemingVariables.colors.gray[0]}
        onClick={props.onClick}
        className={css`
          cursor: pointer;
        `}
      />
    </div>
  )
}
