import { IconCommonClose } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import produce from 'immer'
import IconButton from './kit/IconButton'

export default function FilterPopover(props: {
  value: Editor.SmartQueryBlock['content']['filters'][0]['operands']
  onChange(value: Editor.SmartQueryBlock['content']['filters'][0]['operands']): void
  onClose(): void
}) {
  return (
    <div
      className={css`
        width: 488px;
        border-radius: 10px;
        background-color: ${ThemingVariables.colors.gray[5]};
        box-shadow: ${ThemingVariables.boxShadows[0]};
      `}
    >
      <div
        className={css`
          height: 48px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        `}
      >
        <h3
          className={css`
            font-weight: 500;
            font-size: 12px;
            color: ${ThemingVariables.colors.text[0]};
            margin: 0;
          `}
        >
          Filter
        </h3>
        <IconButton icon={IconCommonClose} color={ThemingVariables.colors.text[0]} onClick={props.onClose} />
      </div>
      <div>
        {props.value.map((operand, index) => (
          <FilterItem
            key={index}
            index={index}
            value={operand}
            onChange={(v) => {
              props.onChange(
                produce(props.value, (draft) => {
                  draft[index] = v
                })
              )
            }}
            onAdd={() => {
              props.onChange(
                produce(props.value, (draft) => {
                  draft.push()
                })
              )
            }}
            onDelete={() => {
              props.onChange(
                produce(props.value, (draft) => {
                  draft.splice(index, 1)
                })
              )
            }}
          />
        ))}
      </div>
    </div>
  )
}

function FilterItem(props: {
  index: number
  value: Editor.SmartQueryBlock['content']['filters'][0]['operands'][0]
  onChange(value: Editor.SmartQueryBlock['content']['filters'][0]['operands'][0]): void
  onAdd(): void
  onDelete(): void
}) {
  return <div>{JSON.stringify(props.value)}</div>
}
