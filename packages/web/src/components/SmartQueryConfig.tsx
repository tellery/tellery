import { useBlock } from '@app/hooks/api'
import { Dimension, Editor } from '@app/types'
import { css, cx } from '@emotion/css'

export default function SmartQueryConfig(props: {
  value: Editor.SmartQueryBlock
  onChange(metricIds?: string[], dimensions?: Dimension[]): void
  className?: string
}) {
  const { data: queryBuilderBlock } = useBlock(props.value.content.queryBuilderId)

  return (
    <div
      className={cx(
        css`
          display: flex;
        `,
        props.className
      )}
    >
      {JSON.stringify(queryBuilderBlock?.content)}
    </div>
  )
}
