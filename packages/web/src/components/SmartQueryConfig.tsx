import { IconCommonArrowRight } from '@app/assets/icons'
import { useBlock, useGetProfileSpec, useSnapshot } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import { Dimension, Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import Tippy from '@tippyjs/react'
import { lowerCase, uniq } from 'lodash'
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
          padding: 10px;
        `}
      >
        {props.metricIds.map((metricId) =>
          queryBuilderBlock.content?.metrics?.[metricId] ? (
            <MenuItem
              key={metricId}
              title={queryBuilderBlock.content.metrics[metricId].name}
              disabled={queryBuilderBlock.content.metrics[metricId].deprecated || props.metricIds.includes(metricId)}
            />
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
            margin-top: 10px;
          `}
        >
          Add metric
        </FormDropdown>
      </div>
      <div
        className={css`
          width: 280px;
          border-right: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 10px;
        `}
      >
        {props.dimensions.map((dimension) => (
          <MenuItem key={dimension.name} title={dimension.name} />
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
            margin-top: 10px;
          `}
        >
          Add dimension
        </FormDropdown>
      </div>
    </div>
  )
}
