import {
  IconCommonAdd,
  IconCommonArrowDouble,
  IconCommonArrowDropDown,
  IconCommonClose,
  IconCommonCloseCircle,
  IconCommonDataAsset,
  IconCommonDataTypeBool,
  IconCommonDataTypeInt,
  IconCommonDataTypeString,
  IconCommonDataTypeTime
} from '@app/assets/icons'
import { TelleryThemeLight, ThemingVariables } from '@app/styles'
import { Editor } from '@app/types'
import { css, cx } from '@emotion/css'
import { FlipModifier } from '@popperjs/core/lib/modifiers/flip'
import { OffsetModifier } from '@popperjs/core/lib/modifiers/offset'
import { PreventOverflowModifier } from '@popperjs/core/lib/modifiers/preventOverflow'
import Tippy from '@tippyjs/react'
import produce from 'immer'
import React, { ReactNode, useEffect, useState } from 'react'
import DateRangePicker from '@wojtekmaj/react-daterange-picker/dist/entry.nostyle'
import DatePicker from 'react-date-picker/dist/entry.nostyle'
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css'
import 'react-date-picker/dist/DatePicker.css'
import { FormButton } from './kit/FormButton'
import IconButton from './kit/IconButton'
import { MenuItem } from './MenuItem'
import { MenuWrapper } from './MenuWrapper'
import { SQLType, SQLTypeReduced } from './v11n/types'
import dayjs from 'dayjs'
import { SVG2DataURI } from '@app/lib/svg'

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
  DATE: [Editor.Filter.EQ, Editor.Filter.IS_BETWEEN],
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

const calenderClassName = css`
  .react-calendar {
    width: 290px;
    padding: 10px;
    border-radius: 8px;
    border: none;
    box-shadow: ${ThemingVariables.boxShadows[0]};
    background-color: ${ThemingVariables.colors.gray[5]};
    overflow: hidden;
  }

  .react-calendar__month-view__weekdays__weekday {
    font-weight: 500;
    font-size: 12px;
    line-height: 15px;
    color: ${ThemingVariables.colors.text[2]};

    abbr {
      text-decoration: none;
    }
  }

  .react-calendar__navigation {
    display: flex;
  }

  .react-calendar__navigation__arrow {
    background: transparent;
    border: none;
    outline: none;
    width: 36px;
    height: 36px;
    padding: 8px;
    margin: 8px 0;
  }

  .react-calendar__navigation__label {
    background: transparent;
    border: none;
    outline: none;
    font-weight: 500;
    font-size: 16px;
    line-height: 20px;
  }

  .react-calendar__month-view__weekdays {
    padding: 0 2px;
  }

  .react-calendar__month-view__weekdays__weekday {
    height: 30px;
    text-align: center;
    font-weight: 500;
    font-size: 12px;
    line-height: 15px;
    color: ${ThemingVariables.colors.text[2]};
  }

  .react-calendar__tile {
    font-weight: 500;
    font-size: 14px;
    line-height: 17px;
    background: transparent;
    border: none;
    outline: none;
    width: 30px;
    height: 30px;
    color: ${ThemingVariables.colors.text[0]};
    cursor: pointer;

    :hover {
      background-image: ${SVG2DataURI(() => (
        <svg width="38" height="30" viewBox="0 0 38 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="0" width="30" height="30" rx="8" fill={TelleryThemeLight.colors.primary[4]} />
        </svg>
      ))};
    }
  }

  .react-calendar__month-view__days {
    margin: 0 2px;
    width: 266px;
    height: 182px;
  }

  .react-calendar__tile--range {
    background-color: ${ThemingVariables.colors.primary[4]};
  }

  .react-calendar__tile--rangeStart,
  .react-calendar__tile--rangeEnd {
    abbr {
      color: ${ThemingVariables.colors.gray[5]};
    }
    background-repeat: no-repeat;
  }

  .react-calendar__tile--rangeStart {
    background-image: ${SVG2DataURI(() => (
      <svg width="38" height="30" viewBox="0 0 38 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="12" height="30" fill="white" />
        <rect x="4" y="0" width="30" height="30" rx="8" fill={TelleryThemeLight.colors.primary[1]} />
      </svg>
    ))} !important;
  }

  .react-calendar__tile--rangeEnd {
    background-image: ${SVG2DataURI(() => (
      <svg width="38" height="30" viewBox="0 0 38 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="26" y="0" width="12" height="30" fill="white" />
        <rect x="4" y="0" width="30" height="30" rx="8" fill={TelleryThemeLight.colors.primary[1]} />
      </svg>
    ))} !important;
  }

  .react-calendar__tile--rangeBothEnds {
    background-color: transparent;
  }

  .react-calendar__month-view__days__day--neighboringMonth {
    color: ${ThemingVariables.colors.text[2]};
  }
`

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
          min-height: 48px;
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
        height: 100%;
        display: flex;
        align-items: stretch;
      `}
    >
      <div
        className={css`
          display: flex;
          flex-direction: column;
        `}
      >
        <div
          className={css`
            flex: 1;
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
            flex: 1;
            width: 36px;
            border-right: 1px solid ${props.isLast ? 'transparent' : ThemingVariables.colors.primary[4]};
          `}
        />
      </div>
      <div
        className={css`
          width: 16px;
          align-self: center;
          border-bottom: 1px solid ${ThemingVariables.colors.primary[4]};
        `}
      />
      <div
        className={css`
          min-height: 44px;
          width: 406px;
          border-radius: 4px;
          background-color: ${ThemingVariables.colors.gray[3]};
          padding: 6px;
          margin-top: ${props.index === 0 ? 0 : 4}px;
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
          flex: 1;
          width: 0;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
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
          SQLTypeReduced[props.value.fieldType] === 'DATE' ? (
            funcArgs[props.value.func] === 1 ? (
              <DatePicker
                view="month"
                format="yyyy-MM-dd"
                maxDetail="month"
                calendarIcon={null}
                clearIcon={null}
                prev2Label={
                  <IconCommonArrowDouble
                    color={ThemingVariables.colors.text[1]}
                    className={css`
                      display: block;
                      transform: rotate(180deg);
                    `}
                  />
                }
                prevLabel={
                  <IconCommonArrowDropDown
                    color={ThemingVariables.colors.text[1]}
                    className={css`
                      display: block;
                      transform: rotate(90deg);
                    `}
                  />
                }
                nextLabel={
                  <IconCommonArrowDropDown
                    color={ThemingVariables.colors.text[1]}
                    className={css`
                      display: block;
                      transform: rotate(270deg);
                    `}
                  />
                }
                next2Label={<IconCommonArrowDouble color={ThemingVariables.colors.text[1]} />}
                value={props.value.args[0] ? new Date(props.value.args[0]) : null}
                onChange={(v?: Date) =>
                  props.onChange(
                    produce(props.value, (draft) => {
                      if (v) {
                        draft.args[0] = dayjs(v).format('YYYY-MM-DD')
                      } else {
                        draft.args = []
                      }
                    })
                  )
                }
                className={cx(
                  calenderClassName,
                  css`
                    .react-date-picker__wrapper {
                      font-size: 12px;
                      color: ${ThemingVariables.colors.text[0]};
                      height: 32px;
                      outline: none;
                      border: none;
                      background-color: ${ThemingVariables.colors.gray[5]};
                      border: 1px solid ${ThemingVariables.colors.gray[1]};
                      box-sizing: border-box;
                      border-radius: 4px;
                      margin-left: 4px;
                      padding: 0 6px;
                    }
                  `
                )}
              />
            ) : (
              <DateRangePicker
                format="yyyy-MM-dd"
                maxDetail="month"
                calendarIcon={null}
                clearIcon={null}
                prev2Label={
                  <IconCommonArrowDouble
                    color={ThemingVariables.colors.text[1]}
                    className={css`
                      display: block;
                      transform: rotate(180deg);
                    `}
                  />
                }
                prevLabel={
                  <IconCommonArrowDropDown
                    color={ThemingVariables.colors.text[1]}
                    className={css`
                      display: block;
                      transform: rotate(90deg);
                    `}
                  />
                }
                nextLabel={
                  <IconCommonArrowDropDown
                    color={ThemingVariables.colors.text[1]}
                    className={css`
                      display: block;
                      transform: rotate(270deg);
                    `}
                  />
                }
                next2Label={<IconCommonArrowDouble color={ThemingVariables.colors.text[1]} />}
                value={
                  props.value.args.length ? props.value.args.map((arg) => (arg ? new Date(arg) : new Date())) : null
                }
                onChange={(v?: Date[]) => {
                  props.onChange(
                    produce(props.value, (draft) => {
                      if (v) {
                        draft.args = v.map((t) => dayjs(t).format('YYYY-MM-DD'))
                      } else {
                        draft.args = []
                      }
                    })
                  )
                }}
                rangeDivider="~"
                className={cx(
                  calenderClassName,
                  css`
                    .react-daterange-picker__wrapper {
                      font-size: 12px;
                      color: ${ThemingVariables.colors.text[0]};
                      height: 32px;
                      outline: none;
                      border: none;
                      background-color: ${ThemingVariables.colors.gray[5]};
                      border: 1px solid ${ThemingVariables.colors.gray[1]};
                      box-sizing: border-box;
                      border-radius: 4px;
                      margin-top: 4px;
                      padding: 0 6px;
                    }
                  `
                )}
              />
            )
          ) : (
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
          )
        ) : (
          <div
            className={css`
              flex: 1;
            `}
          />
        )}
      </div>
      <IconCommonCloseCircle
        color={ThemingVariables.colors.gray[0]}
        onClick={props.onDelete}
        className={css`
          flex-shrink: 0;
          margin-left: 6px;
          cursor: pointer;
        `}
      />
    </div>
  )
}
