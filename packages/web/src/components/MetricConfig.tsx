import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import { FormButton } from './kit/FormButton'

export default function MetricConfig(props: { block: Editor.SQLLikeBlock; className?: string }) {
  if (props.block.type !== Editor.BlockType.Metric) {
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
        <FormButton variant="primary">Convert as data assets</FormButton>
      </div>
    )
  }
  return <div className={props.className}>{props.block.id}</div>
}
