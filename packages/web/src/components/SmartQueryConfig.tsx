import { useBlock } from '@app/hooks/api'
import { Dimension, Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import { uniq } from 'lodash'
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

  if (!queryBuilderBlock) {
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
      <div>
        <MenuWrapper>
          {props.metricIds.map((metricId) =>
            queryBuilderBlock.content?.metrics?.[metricId] ? (
              <MenuItem
                key={metricId}
                title={queryBuilderBlock.content.metrics[metricId].name}
                disabled={queryBuilderBlock.content.metrics[metricId].deprecated || props.metricIds.includes(metricId)}
              />
            ) : null
          )}
        </MenuWrapper>
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
          `}
        >
          Add metric
        </FormDropdown>
      </div>
      <div>
        <MenuWrapper>
          {props.dimensions.map((dimension) => (
            <MenuItem key={dimension.name} title={dimension.name} />
          ))}
        </MenuWrapper>
      </div>
    </div>
  )
}
