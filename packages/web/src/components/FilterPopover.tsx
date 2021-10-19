import { IconCommonAdd, IconCommonClose } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import produce from 'immer'
import { ReactNode } from 'react'
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
      <div
        className={css`
          border-top: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 10px 10px 10px 0;
          > div + div {
            margin-top: 4px;
          }
        `}
      >
        {props.value.operands.map((operand, index) => (
          <FilterItemView
            key={index}
            index={index}
            value={props.value.operator}
            onChange={(v) => {
              props.onChange(
                produce(props.value, (draft) => {
                  draft.operator = v
                })
              )
            }}
          >
            <FilterItem
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
          </FilterItemView>
        ))}
        <FilterItemView
          index={props.value.operands.length}
          value={props.value.operator}
          onChange={(v) => {
            props.onChange(
              produce(props.value, (draft) => {
                draft.operator = v
              })
            )
          }}
        >
          <div
            className={css`
              height: 44px;
              width: 406px;
              border-radius: 4px;
              background-color: ${ThemingVariables.colors.gray[3]};
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <IconCommonAdd color={ThemingVariables.colors.text[0]} />
          </div>
        </FilterItemView>
      </div>
    </div>
  )
}

function FilterItemView(props: {
  index: number
  value: Value['operator']
  onChange(value: Value['operator']): void
  children: ReactNode
}) {
  return (
    <div
      className={css`
        display: flex;
        align-items: center;
      `}
    >
      {props.index === 1 ? (
        <select
          value={props.value}
          onChange={(e) => {
            props.onChange(e.target.value as 'and' | 'or')
          }}
          className={css`
            width: 40px;
            height: 20px;
            border: none;
            outline: none;
            font-weight: 500;
            font-size: 10px;
            line-height: 12px;
            padding: 4px 0;
            margin: 0 16px;
            text-align: center;
            color: ${ThemingVariables.colors.text[0]};
            background: ${ThemingVariables.colors.primary[4]};
            border-radius: 40px;
            cursor: pointer;
          `}
        >
          <option value="and">and</option>
          <option value="or">or</option>
        </select>
      ) : (
        <div
          className={css`
            width: 40px;
            height: 20px;
            border: none;
            outline: none;
            font-weight: 500;
            font-size: 10px;
            line-height: 12px;
            margin: 0 16px;
            padding: 4px 0;
            text-align: center;
            color: ${ThemingVariables.colors.primary[2]};
            background: ${ThemingVariables.colors.primary[4]};
            border-radius: 40px;
          `}
        >
          {props.index === 0 ? 'where' : props.value}
        </div>
      )}
      <div
        className={css`
          height: 44px;
          width: 406px;
          border-radius: 4px;
          background-color: ${ThemingVariables.colors.gray[3]};
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
        `}
      >
        {props.children}
      </div>
    </div>
  )
}

function FilterItem(props: {
  value: Value['operands'][0]
  onChange(value: Value['operands'][0]): void
  onAdd(): void
  onDelete(): void
}) {
  return (
    <div
      className={css`
        color: ${ThemingVariables.colors.text[0]};
      `}
    >
      {JSON.stringify(props.value)}
    </div>
  )
}
