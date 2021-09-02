import { IconCommonClose } from '@app/assets/icons'
import { useBlock, useGetProfileSpec, useSnapshot } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Dimension, Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { lowerCase, uniq } from 'lodash'
import { ReactNode } from 'react-router/node_modules/@types/react'
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
        <FormDropdown
          menu={({ onClick }) => (
            <MenuWrapper>
              {Object.entries(queryBuilderBlock.content?.metrics || {}).map(([metricId, metric]) => (
                <MenuItem
                  key={metricId}
                  title={metric.name}
                  disabled={metric.deprecated || props.metricIds.includes(metricId)}
                  onClick={() => {
                    props.onChange(uniq([...props.metricIds, metricId]), props.dimensions)
                    onClick()
                  }}
                />
              ))}
            </MenuWrapper>
          )}
          className={css`
            width: 100%;
            text-align: start;
            margin-top: 8px;
          `}
        >
          Add metric
        </FormDropdown>
      </div>
      <div
        className={css`
          width: 280px;
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
          Dimensions
        </h3>
        {props.dimensions.map((dimension, index) => (
          <ConfigItem
            key={dimension.name}
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
        <FormDropdown
          menu={({ onClick }) => (
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
                            onClick={() => {
                              props.onChange(props.metricIds, [
                                ...props.dimensions,
                                {
                                  name: `${field.name} ${lowerCase(func)}`,
                                  fieldName: field.name,
                                  fieldType: field.sqlType!,
                                  func
                                }
                              ])
                              onClick()
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
                    onClick={() => {
                      props.onChange(props.metricIds, [
                        ...props.dimensions,
                        {
                          name: field.name,
                          fieldName: field.name,
                          fieldType: field.sqlType!
                        }
                      ])
                      onClick()
                    }}
                  />
                )
              )}
            </MenuWrapper>
          )}
          className={css`
            width: 100%;
            text-align: start;
            margin-top: 8px;
          `}
        >
          Add dimension
        </FormDropdown>
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
          font-size: 14px;
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
