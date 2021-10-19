import { IconCommonClose } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import produce from 'immer'
import IconButton from './kit/IconButton'

type Value = NonNullable<Editor.SmartQueryBlock['content']['filters']>[0]

export default function FilterPopover(props: { value: Value; onChange(value: Value): void; onClose(): void }) {
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
        {props.value.operands.map((operand, index) => (
          <FilterItem
            key={index}
            index={index}
            value={operand}
            onChange={(v) => {
              props.onChange(
                produce(props.value, (draft) => {
                  draft.operands[index] = v
                })
              )
            }}
            onAdd={() => {
              props.onChange(
                produce(props.value, (draft) => {
                  draft.operands.push()
                })
              )
            }}
            onDelete={() => {
              props.onChange(
                produce(props.value, (draft) => {
                  draft.operands.splice(index, 1)
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
  value: Value['operands'][0]
  onChange(value: Value['operands'][0]): void
  onAdd(): void
  onDelete(): void
}) {
  return <div>{JSON.stringify(props.value)}</div>
}
