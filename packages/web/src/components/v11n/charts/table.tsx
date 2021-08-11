import { css, cx } from '@emotion/css'
import { slice } from 'lodash'
import React, { useMemo, useState, useEffect } from 'react'
import { IconCommonArrowDropDown, IconMenuHide, IconMenuShow } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { ConfigLabel } from '../components/ConfigLabel'
import { SortableList } from '../components/SortableList'
import { Type } from '../types'
import { formatRecord, isNumeric } from '../utils'
import type { Chart } from './base'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'
import IconButton from '@app/components/kit/IconButton'
import Tippy from '@tippyjs/react'
import PerfectScrollbar from 'react-perfect-scrollbar'

const TABLE_ROW_HEIGHT_MIN = 30

export const table: Chart<Type.TABLE> = {
  type: Type.TABLE,

  initializeConfig(data, cache) {
    if (cache[Type.TABLE]) {
      return cache[Type.TABLE]!
    }
    return {
      type: Type.TABLE,
      columnOrder: data.fields.map(({ name }) => name),
      columnVisibility: {}
    }
  },

  Configuration(props) {
    return (
      <PerfectScrollbar
        className={css`
          padding: 20px;
          width: 225px;
        `}
        options={{ suppressScrollX: true }}
      >
        <ConfigLabel top={0}>Columns</ConfigLabel>
        <h4
          className={css`
            font-style: normal;
            font-weight: 400;
            font-size: 14px;
            line-height: 17px;
            margin-top: 5px;
            margin-bottom: 5px;
            opacity: 0.3;
          `}
        >
          Drag to reorder columns
        </h4>
        <SortableList
          className={css`
            margin: 0 -5px;
          `}
          value={props.config.columnOrder}
          onChange={(value) => {
            props.onConfigChange('columnOrder', value)
          }}
          renderItem={(item) => (
            <div
              className={css`
                width: 100%;
                padding-right: 10px;
                font-size: 14px;
                font-weight: 400;
                display: flex;
                align-items: center;
                justify-content: space-between;
              `}
            >
              <div
                className={css`
                  flex: 1;
                  width: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  margin-right: 5px;
                `}
              >
                {item}
              </div>
              {props.config.columnVisibility[item] === false ? (
                <IconButton
                  icon={IconMenuHide}
                  color={ThemingVariables.colors.text[0]}
                  className={css`
                    flex-shrink: 0;
                  `}
                  onClick={() => {
                    props.onConfigChange('columnVisibility', {
                      ...props.config.columnVisibility,
                      [item]: true
                    })
                  }}
                />
              ) : (
                <IconButton
                  icon={IconMenuShow}
                  color={ThemingVariables.colors.text[0]}
                  className={css`
                    flex-shrink: 0;
                  `}
                  onClick={() => {
                    props.onConfigChange('columnVisibility', {
                      ...props.config.columnVisibility,
                      [item]: false
                    })
                  }}
                />
              )}
            </div>
          )}
        />
      </PerfectScrollbar>
    )
  },

  Diagram(props) {
    const order = useMemo<{ [key: string]: number }>(() => {
      const map = props.data.fields.reduce((obj, { name }, index) => {
        obj[name] = index
        return obj
      }, {} as { [name: string]: number })
      return props.config.columnOrder.reduce((obj, name, index) => {
        const item = props.data.fields[index]
        if (item) {
          obj[item.name] = map[name]
        }
        return obj
      }, {} as { [name: string]: number })
    }, [props.config.columnOrder, props.data])
    const columns = useMemo(
      () =>
        props.data.fields
          .filter(({ name }) => props.config.columnVisibility[name] !== false)
          .filter(({ name }) => props.data.fields[order[name]])
          .map(({ name }) => ({
            ...props.data.fields[order[name]],
            order: order[name]
          })),
      [order, props.config.columnVisibility, props.data]
    )
    const displayTypes = useDataFieldsDisplayType(props.data.fields)
    const pageSize = Math.max(Math.floor((props.dimensions.height - 1) / (TABLE_ROW_HEIGHT_MIN + 1)) - 2, 1)
    const tableRowHeight = (props.dimensions.height - 1) / (pageSize + 2) - 1
    const pageCount = Math.ceil(props.data.records.length / pageSize)
    const [page, setPage] = useState(0)
    const data = useMemo(
      () => slice(props.data.records, page * pageSize, (page + 1) * pageSize),
      [page, pageSize, props.data.records]
    )
    const from = useMemo(
      () => props.data.records.length && page * pageSize + 1,
      [page, pageSize, props.data.records.length]
    )
    const to = useMemo(
      () => Math.min((page + 1) * pageSize, props.data.records.length),
      [page, pageSize, props.data.records.length]
    )
    useEffect(() => {
      if (from > to) {
        setPage(0)
      }
    }, [from, to])

    return (
      <div
        className={css`
          height: 100%;
          width: 100%;
          position: relative;
          display: flex;
          flex-direction: column;
          border: 1px solid ${ThemingVariables.colors.gray[1]};
          background: ${ThemingVariables.colors.gray[5]};
          font-size: 14px;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        <div
          className={css`
            flex: 1;
            width: 100%;
          `}
        >
          <PerfectScrollbar options={{ suppressScrollY: true }}>
            <table
              className={css`
                min-width: 100%;
                max-height: 100%;
                border-collapse: collapse;
                border: none;
                td,
                th {
                  border: 1px solid ${ThemingVariables.colors.gray[1]};
                }
                tr:first-child td,
                th {
                  border-top: none;
                }
                tr td:first-child,
                th:first-child {
                  border-left: none;
                }
                tr td:last-child,
                th:last-child {
                  border-right: none;
                }
              `}
            >
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.name}
                      className={css`
                        height: ${tableRowHeight}px;
                        padding: 0 10px;
                        font-weight: 600;
                        background: ${ThemingVariables.colors.primary[4]};
                        white-space: nowrap;
                      `}
                      align={isNumeric(column.displayType) ? 'right' : 'left'}
                    >
                      <Tippy content={column.sqlType}>
                        <span>{column.name}</span>
                      </Tippy>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((record, index) => (
                  <tr key={index.toString()}>
                    {columns.map((column) => (
                      <td
                        key={column.name}
                        className={cx(
                          css`
                            height: ${tableRowHeight}px;
                            padding: 0 10px;
                            font-weight: normal;
                            white-space: nowrap;
                            text-overflow: ellipsis;
                            overflow: hidden;
                            max-width: 400px;
                          `,
                          record[column.order] === null
                            ? css`
                                color: ${ThemingVariables.colors.text[2]};
                              `
                            : undefined
                        )}
                        align={isNumeric(column.displayType) ? 'right' : 'left'}
                      >
                        {formatRecord(record[column.order], displayTypes[column.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </PerfectScrollbar>
        </div>
        <div
          className={css`
            height: ${tableRowHeight}px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            user-select: none;
          `}
        >
          {props.data.records.length}&nbsp;rows
          <div
            className={css`
              flex: 1;
            `}
          />
          <IconButton
            icon={IconCommonArrowDropDown}
            disabled={page <= 0}
            color={ThemingVariables.colors.text[0]}
            onClick={() => {
              setPage((old) => old - 1)
            }}
            className={css`
              margin-left: 10px;
              margin-right: 5px;
              transform: rotate(90deg);
            `}
          />
          {from}&nbsp;~&nbsp;{to}
          <IconButton
            icon={IconCommonArrowDropDown}
            disabled={page >= pageCount - 1}
            color={ThemingVariables.colors.text[0]}
            onClick={() => {
              setPage((old) => old + 1)
            }}
            className={css`
              margin-left: 5px;
              transform: rotate(270deg);
            `}
          />
        </div>
      </div>
    )
  }
}
