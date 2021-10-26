import {
  IconCommonAdd,
  IconCommonArrowDropDown,
  IconCommonClose,
  IconCommonCloseCircle,
  IconCommonDataAsset,
  IconCommonDataTypeBool,
  IconCommonDataTypeInt,
  IconCommonDataTypeString,
  IconCommonDataTypeTime
} from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css } from '@emotion/css'
import { FlipModifier } from '@popperjs/core/lib/modifiers/flip'
import { OffsetModifier } from '@popperjs/core/lib/modifiers/offset'
import { PreventOverflowModifier } from '@popperjs/core/lib/modifiers/preventOverflow'
import Tippy from '@tippyjs/react'
import produce from 'immer'
import React, { ReactNode, useEffect, useState } from 'react'
import { FormButton } from './kit/FormButton'
import IconButton from './kit/IconButton'
import { MenuItem } from './MenuItem'
import { MenuWrapper } from './MenuWrapper'
import { SQLType, SQLTypeReduced } from './v11n/types'

type Value = NonNullable<Editor.SmartQueryBlock['content']['filters']>

const popperModifiers: Partial<Partial<OffsetModifier | PreventOverflowModifier | FlipModifier>>[] = [
  {
    name: 'preventOverflow',
    enabled: true,
    options: {
      boundary: document.body,
      altAxis: true,
      altBoundary: true,
      padding: 10
    }
  }
]

const typeToFunc = {
  OTHER: [] as Editor.Filter[],
  BOOL: [Editor.Filter.IS_TRUE, Editor.Filter.IS_FALSE],
  NUMBER: [
    Editor.Filter.EQ,
    Editor.Filter.NE,
    Editor.Filter.LT,
    Editor.Filter.LTE,
    Editor.Filter.GT,
    Editor.Filter.GTE,
    Editor.Filter.IS_NULL,
    Editor.Filter.IS_NOT_NULL,
    Editor.Filter.IS_BETWEEN
  ],
  DATE: [Editor.Filter.LTE, Editor.Filter.GTE, Editor.Filter.IS_BETWEEN],
  STRING: [Editor.Filter.EQ, Editor.Filter.NE, Editor.Filter.CONTAINS, Editor.Filter.IS_NULL, Editor.Filter.IS_NOT_NULL]
}

const funcArgs = {
  [Editor.Filter.EQ]: 1,
  [Editor.Filter.NE]: 1,
  [Editor.Filter.LT]: 1,
  [Editor.Filter.LTE]: 1,
  [Editor.Filter.GT]: 1,
  [Editor.Filter.GTE]: 1,
  [Editor.Filter.CONTAINS]: 1,
  [Editor.Filter.IS_NULL]: 0,
  [Editor.Filter.IS_NOT_NULL]: 0,
  [Editor.Filter.IS_TRUE]: 0,
  [Editor.Filter.IS_FALSE]: 0,
  [Editor.Filter.IS_BETWEEN]: 2
}

export default function FilterPopover(props: {
  fields: readonly { name: string; sqlType: SQLType }[]
  value: Value
  onChange(value: Value): void
  onDelete(): void
  onClose(): void
}) {
  const [value, setValue] = useState(props.value)
  useEffect(() => {
    setValue(props.value)
  }, [props.value])

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
        <IconButton
          icon={IconCommonClose}
          color={ThemingVariables.colors.text[0]}
          onClick={() => {
            setValue(props.value)
            props.onClose()
          }}
        />
      </div>
      <div
        className={css`
          border-top: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 10px 10px 10px 0;
        `}
      >
        {value.operands.map((operand, index) => (
          <FilterItemView
            key={index}
            index={index}
            isLast={false}
            value={value.operator}
            onChange={(v) => {
              setValue(
                produce(value, (draft) => {
                  draft.operator = v
                })
              )
            }}
          >
            <FilterItem
              fields={props.fields}
              value={operand}
              onChange={(v) => {
                setValue(
                  produce(value, (draft) => {
                    draft.operands[index] = v
                  })
                )
              }}
              onDelete={() => {
                setValue(
                  produce(value, (draft) => {
                    draft.operands.splice(index, 1)
                  })
                )
              }}
            />
          </FilterItemView>
        ))}
        <FilterItemView
          index={value.operands.length}
          isLast={true}
          value={value.operator}
          onChange={(v) => {
            setValue(
              produce(value, (draft) => {
                draft.operator = v
              })
            )
          }}
        >
          <div
            onClick={() => {
              setValue(
                produce(value, (draft) => {
                  draft.operands.push({
                    fieldName: props.fields[0].name,
                    fieldType: props.fields[0].sqlType,
                    func: Editor.Filter.EQ,
                    args: []
                  })
                })
              )
            }}
            className={css`
              height: 100%;
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
            `}
          >
            <IconCommonAdd color={ThemingVariables.colors.text[0]} />
          </div>
        </FilterItemView>
      </div>
      <div
        className={css`
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          padding: 8px 10px;
          display: flex;
        `}
      >
        <FormButton
          variant="primary"
          onClick={() => {
            props.onChange(value)
          }}
          className={css`
            flex: 1;
          `}
        >
          Save
        </FormButton>
        <FormButton
          variant="danger"
          onClick={() => {
            if (confirm('Delete filter?')) {
              props.onDelete()
            }
          }}
          className={css`
            margin-left: 8px;
            width: 140px;
          `}
        >
          Delete
        </FormButton>
      </div>
    </div>
  )
}

function FilterItemView(props: {
  index: number
  isLast: boolean
  value: Value['operator']
  onChange(value: Value['operator']): void
  children: ReactNode
}) {
  return (
    <div
      className={css`
        display: flex;
        align-items: flex-start;
        height: ${props.isLast ? 44 : 48}px;
      `}
    >
      <div>
        <div
          className={css`
            height: 12px;
            width: 36px;
            border-right: 1px solid ${props.index === 0 ? 'transparent' : ThemingVariables.colors.primary[4]};
          `}
        />
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
              padding: 2px 0;
              margin-left: 16px;
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
              margin-left: 16px;
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
            height: 16px;
            width: 36px;
            border-right: 1px solid ${props.isLast ? 'transparent' : ThemingVariables.colors.primary[4]};
          `}
        />
      </div>
      <div
        className={css`
          height: 22px;
          width: 16px;
          border-bottom: 1px solid ${ThemingVariables.colors.primary[4]};
        `}
      />
      <div
        className={css`
          height: 44px;
          width: 406px;
          border-radius: 4px;
          background-color: ${ThemingVariables.colors.gray[3]};
          padding: 6px;
        `}
      >
        {props.children}
      </div>
    </div>
  )
}

function FilterItem(props: {
  fields: readonly { name: string; sqlType: SQLType }[]
  value: Value['operands'][0]
  onChange(value: Value['operands'][0]): void
  onDelete(): void
}) {
  const [visible0, setVisible0] = useState(false)
  const [visible1, setVisible1] = useState(false)

  return (
    <div
      className={css`
        display: flex;
        align-items: center;
      `}
    >
      <div
        className={css`
          flex-shrink: 0;
          width: 140px;
          height: 32px;
          background-color: ${ThemingVariables.colors.gray[5]};
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          box-sizing: border-box;
          border-radius: 4px;
          display: flex;
          align-items: center;
          padding: 0 6px;
        `}
      >
        {
          {
            OTHER: <IconCommonDataAsset color={ThemingVariables.colors.gray[0]} />,
            BOOL: <IconCommonDataTypeBool color={ThemingVariables.colors.gray[0]} />,
            NUMBER: <IconCommonDataTypeInt color={ThemingVariables.colors.gray[0]} />,
            DATE: <IconCommonDataTypeTime color={ThemingVariables.colors.gray[0]} />,
            STRING: <IconCommonDataTypeString color={ThemingVariables.colors.gray[0]} />
          }[SQLTypeReduced[props.value.fieldType]]
        }
        <Tippy
          visible={visible0}
          onClickOutside={() => {
            setVisible0(false)
          }}
          interactive={true}
          // placement="bottom-start"
          // offset={[-35, 5]}
          theme="tellery"
          arrow={false}
          appendTo={document.body}
          popperOptions={{ modifiers: popperModifiers }}
          content={
            <MenuWrapper>
              {props.fields.map((f) => (
                <MenuItem
                  key={f.name}
                  icon={
                    {
                      OTHER: <IconCommonDataAsset color={ThemingVariables.colors.gray[0]} />,
                      BOOL: <IconCommonDataTypeBool color={ThemingVariables.colors.gray[0]} />,
                      NUMBER: <IconCommonDataTypeInt color={ThemingVariables.colors.gray[0]} />,
                      DATE: <IconCommonDataTypeTime color={ThemingVariables.colors.gray[0]} />,
                      STRING: <IconCommonDataTypeString color={ThemingVariables.colors.gray[0]} />
                    }[SQLTypeReduced[f.sqlType]]
                  }
                  title={f.name}
                  onClick={() => {
                    const funcs = typeToFunc[SQLTypeReduced[f.sqlType]]
                    props.onChange({
                      fieldName: f.name,
                      fieldType: f.sqlType,
                      func: funcs.includes(props.value.func) ? props.value.func : funcs[0],
                      args: []
                    })
                    setVisible0(false)
                  }}
                />
              ))}
            </MenuWrapper>
          }
        >
          <div
            onClick={() => setVisible0((old) => !old)}
            className={css`
              display: flex;
              flex: 1;
              align-items: center;
              cursor: pointer;
            `}
          >
            <div
              className={css`
                flex: 1;
                width: 0;
                margin-left: 6px;
                font-size: 12px;
                color: ${ThemingVariables.colors.text[0]};
                text-overflow: ellipsis;
                overflow: hidden;
              `}
            >
              {props.value.fieldName}
            </div>
            <IconCommonArrowDropDown color={ThemingVariables.colors.text[0]} />
          </div>
        </Tippy>
      </div>
      <div
        className={css`
          flex-shrink: 0;
          width: 120px;
          height: 32px;
          background-color: ${ThemingVariables.colors.gray[5]};
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          box-sizing: border-box;
          border-radius: 4px;
          display: flex;
          align-items: center;
          padding: 0 6px;
          margin-left: 4px;
        `}
      >
        <Tippy
          visible={visible1}
          onClickOutside={() => {
            setVisible1(false)
          }}
          interactive={true}
          // placement="bottom-start"
          // offset={[-15, 5]}
          theme="tellery"
          arrow={false}
          appendTo={document.body}
          popperOptions={{ modifiers: popperModifiers }}
          content={
            <MenuWrapper>
              {typeToFunc[SQLTypeReduced[props.value.fieldType]].map((filter) => (
                <MenuItem
                  key={filter}
                  title={Editor.FilterNames[filter]}
                  onClick={() => {
                    props.onChange({
                      ...props.value,
                      func: filter,
                      args: []
                    })
                    setVisible1(false)
                  }}
                />
              ))}
            </MenuWrapper>
          }
        >
          <div
            onClick={() => setVisible1((old) => !old)}
            className={css`
              display: flex;
              flex: 1;
              align-items: center;
              cursor: pointer;
            `}
          >
            <div
              className={css`
                flex: 1;
                width: 0;
                margin-left: 6px;
                font-size: 12px;
                color: ${ThemingVariables.colors.text[0]};
                text-overflow: ellipsis;
                overflow: hidden;
              `}
            >
              {Editor.FilterNames[props.value.func]}
            </div>
            <IconCommonArrowDropDown color={ThemingVariables.colors.text[0]} />
          </div>
        </Tippy>
      </div>
      {funcArgs[props.value.func] ? (
        Array.from({ length: funcArgs[props.value.func] }).map((_, index) => (
          <input
            key={index}
            value={props.value.args[index]}
            onChange={(e) => {
              props.onChange(
                produce(props.value, (draft) => {
                  draft.args[index] = e.target.value
                })
              )
            }}
            className={css`
              font-size: 12px;
              color: ${ThemingVariables.colors.text[0]};
              width: 0;
              flex: 1;
              height: 32px;
              outline: none;
              border: none;
              background-color: ${ThemingVariables.colors.gray[5]};
              border: 1px solid ${ThemingVariables.colors.gray[1]};
              box-sizing: border-box;
              border-radius: 4px;
              margin-left: 4px;
              padding: 0 6px;
            `}
          />
        ))
      ) : (
        <div
          className={css`
            flex: 1;
          `}
        />
      )}
      <IconCommonCloseCircle
        color={ThemingVariables.colors.gray[0]}
        onClick={props.onDelete}
        className={css`
          margin-left: 6px;
          cursor: pointer;
        `}
      />
    </div>
  )
}
