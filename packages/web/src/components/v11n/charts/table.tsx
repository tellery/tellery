import { css, cx } from '@emotion/css'
import { slice } from 'lodash'
import React, { useMemo, useState, useEffect } from 'react'
import { IconCommonArrowUnfold, IconMenuHide, IconMenuShow } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'
import { ConfigLabel } from '../components/ConfigLabel'
import { SortableList } from '../components/SortableList'
import { Type } from '../types'
import { formatRecord, isNumeric, isTimeSeries } from '../utils'
import type { Chart } from './base'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'
import IconButton from '@app/components/kit/IconButton'
import Tippy from '@tippyjs/react'
import PerfectScrollbar from 'react-perfect-scrollbar'
import { ConfigSection } from '../components/ConfigSection'
import { ConfigTab } from '../components/ConfigTab'

const TABLE_ROW_HEIGHT_MIN = 30

const VERTICAL_BORDER_WITDH = 0

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
      <ConfigTab tabs={['Data']}>
        <ConfigSection>
          <ConfigLabel>Columns</ConfigLabel>
          <SortableList
            value={props.config.columnOrder}
            onChange={(value) => {
              props.onConfigChange('columnOrder', value)
            }}
            renderItem={(item) => (
              <div
                className={css`
                  width: 100%;
                  padding-right: 10px;
                  font-size: 12px;
                  color: ${ThemingVariables.colors.text[0]};
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
                    color={ThemingVariables.colors.text[1]}
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
                    color={ThemingVariables.colors.text[1]}
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
        </ConfigSection>
      </ConfigTab>
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
    const tableRowHeight = (props.dimensions.height - VERTICAL_BORDER_WITDH) / (pageSize + 2) - VERTICAL_BORDER_WITDH
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
          background: ${ThemingVariables.colors.gray[5]};
          font-size: 14px;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        <PerfectScrollbar
          options={{ suppressScrollY: true }}
          className={css`
            flex: 1;
            width: 100%;
          `}
        >
          <table
            className={css`
              min-width: 100%;
              max-height: 100%;
              border-collapse: collapse;
              border: none;
              tr:nth-child(even) {
                background: ${ThemingVariables.colors.primary[5]};
              }
              td {
                border-left: 1px solid ${ThemingVariables.colors.gray[1]};
              }
              tr td:first-child {
                border-left: none;
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
                      background: ${ThemingVariables.colors.primary[3]};
                      font-weight: normal;
                      white-space: nowrap;
                    `}
                    align={isNumeric(column.displayType) && !isTimeSeries(column.displayType) ? 'right' : 'left'}
                  >
                    <Tippy content={column.sqlType} delay={300}>
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
                          font-variant-numeric: tabular-nums;
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
        <div
          className={css`
            height: ${tableRowHeight}px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 10px;
            user-select: none;
            background: ${ThemingVariables.colors.primary[4]};
          `}
        >
          {props.data.records.length}&nbsp;rows
          <div
            className={css`
              flex: 1;
            `}
          />
          <IconButton
            icon={IconCommonArrowUnfold}
            disabled={page <= 0}
            color={ThemingVariables.colors.text[0]}
            onClick={() => {
              setPage((old) => old - 1)
            }}
            className={css`
              margin-left: 10px;
              margin-right: 10px;
              transform: rotate(180deg);
            `}
          />
          {from}~{to}
          <IconButton
            icon={IconCommonArrowUnfold}
            disabled={page >= pageCount - 1}
            color={ThemingVariables.colors.text[0]}
            onClick={() => {
              setPage((old) => old + 1)
            }}
            className={css`
              margin-left: 10px;
            `}
          />
        </div>
      </div>
    )
  }
}
