import { IconCommonArrowLeft, IconCommonArrowUnfold, IconMenuHide, IconMenuShow } from '@app/assets/icons'
import FormSwitch from '@app/components/kit/FormSwitch'
import IconButton from '@app/components/kit/IconButton'
import { useBindHovering, useDebounce } from '@app/hooks'
import { useDataFieldsDisplayType } from '@app/hooks/useDataFieldsDisplayType'
import { ThemingVariables } from '@app/styles'
import { css, cx } from '@emotion/css'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  ColumnDef,
  ColumnOrderState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table'
import Tippy from '@tippyjs/react'
import { sortBy, uniq } from 'lodash'
import React, { memo, useEffect, useMemo, useState } from 'react'
import { usePopper } from 'react-popper'
import { ConfigItem } from '../components/ConfigItem'
import { ConfigSection } from '../components/ConfigSection'
import { ConfigSelect } from '../components/ConfigSelect'
import { ConfigTab } from '../components/ConfigTab'
import { SortableList } from '../components/SortableList'
import { Config, Data, DisplayType, Type } from '../types'
import { formatRecord, isNumeric, isTimeSeries } from '../utils'
import type { Chart } from './base'

const TABLE_ROW_HEIGHT_MIN = 30

const VERTICAL_BORDER_WITDH = 0

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  // Rank the item
  const itemRank = rankItem(row.getValue(columnId), value)

  // Store the itemRank info
  addMeta({
    itemRank
  })

  // Return if the item should be filtered in/out
  return itemRank.passed
}

function GlobalFilter({ value, setGlobalFilter }: { value?: string; setGlobalFilter: (value: string) => void }) {
  const [_value, setValue] = useState(value)
  const onChange = useDebounce((_value) => {
    setGlobalFilter(_value || undefined)
  }, 200)

  return (
    <input
      value={_value || ''}
      onChange={(e) => {
        setValue(e.target.value)
        onChange(e.target.value)
      }}
      onCut={(e) => {
        e.stopPropagation()
      }}
      className={css`
        font-size: 12px;
        color: ${ThemingVariables.colors.text[0]};
        width: 0;
        flex: 1;
        height: 24px;
        outline: none;
        border: none;
        background-color: ${ThemingVariables.colors.primary[5]};
        box-sizing: border-box;
        border-radius: 4px;
        margin-left: 4px;
        padding: 0 6px;
      `}
      placeholder={`search...`}
    />
  )
}

const getPageSizeByHeight = (height: number) => Math.max(Math.floor((height - 1) / (TABLE_ROW_HEIGHT_MIN + 1)) - 2, 1)

enum DISPLAY_AS_TYPE {
  Auto = 'auto',
  Text = 'text',
  Link = 'link',
  Image = 'image'
}
const DISPLAY_AS_TYPES = [DISPLAY_AS_TYPE.Auto, DISPLAY_AS_TYPE.Text, DISPLAY_AS_TYPE.Link, DISPLAY_AS_TYPE.Image]

const isImage = (text: string) => /^https?:\/\/.*\/.*\.(png|gif|webp|jpeg|jpg|heic|bmp)\??.*/i.test(text)
const isLink = (text: string) => /^https?:\/\//.test(text)
const extractHostFromLink = (link: string) => {
  try {
    const url = new URL(link)
    return url.hostname
  } catch {
    return link
  }
}

const getDisplayTypeData = (text: string, type: DISPLAY_AS_TYPE) => {
  let asType = type
  let data: string[] = [text]
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed) && parsed[0] && typeof parsed[0] === 'string') {
      data = parsed
    }
  } catch (e) {}

  if (asType === DISPLAY_AS_TYPE.Auto) {
    if (isImage(data[0])) {
      asType = DISPLAY_AS_TYPE.Image
    } else if (isLink(data[0])) {
      asType = DISPLAY_AS_TYPE.Link
    } else {
      asType = DISPLAY_AS_TYPE.Text
    }
  }

  return [data, asType] as [string[], DISPLAY_AS_TYPE]
}
const pivotTable = (data: Data, config: Config<Type.TABLE>) => {
  const { pivotTable: pivotTableConfig } = config
  if (!pivotTableConfig) return data
  const groupByIndex = data.fields.findIndex(
    (field) => field.name !== pivotTableConfig?.cellColumn && field.name !== pivotTableConfig?.cellColumn
  )
  const cellIndex = data.fields.findIndex((field) => field.name === pivotTableConfig?.cellColumn)
  const groupedRecord = data.records.reduce((a, c) => {
    const groupId = c[groupByIndex] as string
    if (!a[groupId]) {
      a[groupId] = [] as Data['records']
    }
    ;(a[groupId] as unknown[][]).push(c)
    return a
  }, {} as Record<string, Data['records']>)
  const pivotColumnIndex = data.fields.findIndex((field) => field.name === pivotTableConfig?.pivotColumn)
  const pivotColumns = uniq(data.records.map((record) => record[pivotColumnIndex]))
  const ids = Object.keys(groupedRecord)
  const records = ids.map((id) => {
    return [
      id,
      ...pivotColumns.map((column) => {
        const records = groupedRecord[id]
        const record = records.find((record) => record[pivotColumnIndex] === column)
        return record ? record[cellIndex] : ''
      })
    ]
  })
  return {
    fields: [
      data.fields[groupByIndex],
      ...pivotColumns.map((column) => {
        return { ...data.fields[cellIndex], name: column as string }
      })
    ],
    records
  }
}
const ImageRenderer: React.FC<{ src: string }> = memo(({ src }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLImageElement | null>(null)
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null)
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    strategy: 'fixed',
    placement: 'right-start'
  })
  const [bind, hovering] = useBindHovering()
  return (
    <>
      <div
        className={css`
          position: relative;
          width: 24px;
          height: 24px;
        `}
        {...bind()}
      >
        <img
          ref={setReferenceElement}
          title={src}
          src={src}
          className={css`
            width: 24px;
            height: 24px;
            object-fit: cover;
          `}
        ></img>
        {hovering && (
          <div
            ref={setPopperElement}
            className={css`
              width: 300px;
              height: 300px;
              z-index: 1000;
            `}
            style={styles.popper}
            {...attributes.popper}
          >
            <img
              title={src}
              src={src}
              className={css`
                width: 100%;
                height: 100%;
                object-fit: cover;
              `}
            ></img>
          </div>
        )}
      </div>
    </>
  )
})
ImageRenderer.displayName = 'ImageRenderer'

const CellRenderer: ReactFCWithChildren<{ cell: any; displayType: DisplayType; displayAs?: DISPLAY_AS_TYPE }> = ({
  cell,
  displayType,
  displayAs = DISPLAY_AS_TYPE.Auto
}) => {
  const value = cell.getValue(cell.column.id)
  if (displayType !== 'STRING') {
    return <>{formatRecord(value, displayType)}</>
  }
  const [data, asType] = getDisplayTypeData(value, displayAs)
  if (asType === DISPLAY_AS_TYPE.Text) {
    return <>{formatRecord(value, displayType)}</>
  } else if (asType === DISPLAY_AS_TYPE.Image) {
    return (
      <>
        {data.map((item, i) => {
          return <ImageRenderer src={item} key={i} />
        })}
      </>
    )
  } else if (asType === DISPLAY_AS_TYPE.Link) {
    return (
      <>
        {data.map((item, i) => {
          return (
            <a
              key={i}
              href={item}
              target="_blank"
              className={css`
                color: ${ThemingVariables.colors.primary[1]};
                word-wrap: break-word;
                text-decoration: inherit;
                user-select: text;
                border-bottom: solid 1px currentColor;
              `}
              rel="noreferrer"
            >
              {extractHostFromLink(item)}
            </a>
          )
        })}
      </>
    )
  }
  return <>{formatRecord(value, displayType)}</>
}

declare module '@tanstack/table-core' {
  interface ColumnMeta {
    name: string
    displayType: DisplayType
    sqlType: string
  }
}

export const table: Chart<Type.TABLE> = {
  type: Type.TABLE,

  initializeConfig(data, { cache }) {
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
    // TODO: remove this
    const columnOrder = useMemo(
      () =>
        sortBy(props.config.columnOrder).join() === sortBy(props.data.fields.map(({ name }) => name)).join()
          ? props.config.columnOrder
          : props.data.fields.map(({ name }) => name),
      [props.config.columnOrder, props.data.fields]
    )
    const fileds = props.data.fields ?? []
    const pivotTableAvailable = fileds.length === 3
    return (
      <ConfigTab tabs={['Data']}>
        <>
          {pivotTableAvailable && (
            <ConfigSection title="Pivot Table">
              <ConfigItem label="Enable">
                <div
                  className={css`
                    display: flex;
                    justify-content: flex-end;
                    line-height: 0;
                    padding-right: 6px;
                  `}
                >
                  <FormSwitch
                    checked={!!props.config.pivotTable}
                    onChange={(e) => {
                      props.onConfigChange(
                        'pivotTable',
                        e.currentTarget.checked
                          ? {
                              pivotColumn: fileds[0]?.name,
                              cellColumn: fileds[0]?.name
                            }
                          : undefined
                      )
                    }}
                  />
                </div>
              </ConfigItem>
              {props.config.pivotTable && (
                <>
                  <ConfigItem label="Pivot Column">
                    <ConfigSelect
                      onChange={(value) => {
                        props.onConfigChange('pivotTable', {
                          pivotColumn: value,
                          cellColumn: props.config.pivotTable!.cellColumn
                        })
                      }}
                      value={props.config.pivotTable!.pivotColumn}
                      options={props.data.fields?.map((field) => field.name)}
                    ></ConfigSelect>
                  </ConfigItem>
                  <ConfigItem label="Cell Column">
                    <ConfigSelect
                      onChange={(value) => {
                        props.onConfigChange('pivotTable', {
                          pivotColumn: props.config.pivotTable!.pivotColumn,
                          cellColumn: value
                        })
                      }}
                      value={props.config.pivotTable!.cellColumn}
                      options={props.data.fields?.map((field) => field.name)}
                    ></ConfigSelect>
                  </ConfigItem>
                </>
              )}
            </ConfigSection>
          )}
          {!props.config.pivotTable && (
            <ConfigSection title="Columns">
              <SortableList
                value={columnOrder}
                onChange={(value) => {
                  props.onConfigChange('columnOrder', value)
                }}
                renderItem={(item) => {
                  const filed = props.data.fields.find((f) => f.name === item)
                  return (
                    <div
                      className={css`
                        width: 100%;
                        overflow-x: hidden;
                        font-size: 12px;
                        padding: 0 6px;
                        height: 32px;
                        color: ${ThemingVariables.colors.text[0]};
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        border-radius: 4px;
                        :hover {
                          background-color: ${ThemingVariables.colors.primary[5]};
                        }
                      `}
                    >
                      <Tippy content={item} placement="left" delay={[1000, 500]}>
                        <div
                          className={css`
                            flex-grow: 1;
                            flex-shrink: 1;
                            margin-right: 10px;
                            overflow: hidden;
                            text-overflow: ellipsis;
                          `}
                        >
                          <span>{item}</span>
                        </div>
                      </Tippy>

                      {filed?.displayType === 'STRING' && (
                        <div
                          className={css`
                            flex-shrink: 0;
                            width: 100px;
                            margin-right: 10px;
                          `}
                        >
                          <ConfigSelect
                            title="string display as"
                            options={DISPLAY_AS_TYPES}
                            value={props.config.displayAs?.[item] ?? DISPLAY_AS_TYPE.Auto}
                            className={css`
                              height: 28px;
                            `}
                            onChange={(value) => {
                              props.onConfigChange('displayAs', {
                                ...props.config.displayAs,
                                [item]: value
                              })
                            }}
                          />
                        </div>
                      )}
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
                  )
                }}
              />
            </ConfigSection>
          )}
        </>
      </ConfigTab>
    )
  },

  Diagram(props) {
    const data = useMemo(() => {
      if (props.config.pivotTable) {
        return pivotTable(props.data, props.config)
      } else {
        return props.data
      }
    }, [props.data, props.config])
    const columnOrder = useMemo<ColumnOrderState>(
      () =>
        sortBy(props.config.columnOrder).join() === sortBy(data.fields.map(({ name }) => name)).join()
          ? props.config.columnOrder
          : data.fields.map(({ name }) => name),
      [props.config.columnOrder, data.fields]
    )
    const columnVisibility = props.config.columnVisibility
    const columns = useMemo(
      () =>
        data.fields.map((field, index) => ({
          id: field.name,
          accessorFn: (record) => record[index],
          meta: {
            name: field.name,
            displayType: field.displayType,
            sqlType: field.sqlType
          }
        })) as ColumnDef<unknown[]>[],
      [data]
    )
    const displayTypes = useDataFieldsDisplayType(data.fields)
    const [globalFilter, setGlobalFilter] = React.useState('')
    const [sorting, setSorting] = React.useState<SortingState>([])

    const {
      getHeaderGroups,
      getRowModel,
      setPageSize,
      getState,
      getPrePaginationRowModel,
      getCanNextPage,
      getCanPreviousPage,
      previousPage,
      nextPage

      // state: { globalFilter },
      // preGlobalFilteredRows,
      // setGlobalFilter
    } = useReactTable({
      columns: columns,
      data: data.records as unknown[][],
      state: {
        // pagination,
        columnVisibility,
        columnOrder,
        globalFilter,
        sorting
      },
      onSortingChange: setSorting,
      onGlobalFilterChange: setGlobalFilter,
      globalFilterFn: fuzzyFilter,
      getFilteredRowModel: getFilteredRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getCoreRowModel: getCoreRowModel()
    })

    useEffect(() => {
      setPageSize(getPageSizeByHeight(props.dimensions.height))
    }, [props.dimensions.height, setPageSize])

    const tableRowHeight =
      (props.dimensions.height - VERTICAL_BORDER_WITDH) / (getState().pagination.pageSize + 2) - VERTICAL_BORDER_WITDH
    return (
      <>
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
          <div
            className={css`
              flex: 1;
              width: 100%;
              overflow-x: auto;
              /* TODO: append scrollbar size to prevent this */
              overflow-y: hidden;
            `}
          >
            <table
              // {...getTableProps()}
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
                {getHeaderGroups().map((headerGroup) => (
                  // eslint-disable-next-line react/jsx-key
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) =>
                      header.isPlaceholder ? null : (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          className={css`
                            height: ${tableRowHeight}px;
                            padding: 0 10px;
                            background: ${ThemingVariables.colors.primary[3]};
                            font-weight: normal;
                            white-space: nowrap;
                            cursor: pointer;
                          `}
                          align={
                            isNumeric(header.column.columnDef.meta?.displayType) &&
                            !isTimeSeries(header.column.columnDef.meta?.displayType)
                              ? 'right'
                              : 'left'
                          }
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <Tippy content={header.column.columnDef.meta?.sqlType} delay={300}>
                            <span> {flexRender(header.column.columnDef.header, header.getContext())}</span>
                          </Tippy>
                          {header.column.getIsSorted() && (
                            <IconCommonArrowLeft
                              style={{
                                width: 10,
                                lineHeight: '100%',
                                transform: header.column.getIsSorted() === 'asc' ? 'rotate(-90deg)' : 'rotate(-270deg)',
                                verticalAlign: 'middle',
                                marginLeft: 5
                              }}
                            />
                          )}
                        </th>
                      )
                    )}
                  </tr>
                ))}
              </thead>
              <tbody>
                {/* {page.map((row: unknown) => {
                  prepareRow(row)
                  return null
                })} */}
                {getRowModel().rows.map((row, index: number) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.column.columnDef.meta?.name}
                        // {...cell.getCellProps()}
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
                            position: relative;
                            user-select: all;
                            .copy-icon {
                              cursor: pointer;
                              display: none;
                              position: absolute;
                              right: 10px;
                              top: 0;
                              bottom: 0;
                              margin: auto;
                              opacity: 0.8;
                            }
                            &:hover .copy-icon {
                              cursor: pointer;
                              display: inline-block;
                            }
                          `
                        )}
                        align={
                          isNumeric(cell.column.columnDef.meta?.displayType) &&
                          !isTimeSeries(cell.column.columnDef.meta?.displayType)
                            ? 'right'
                            : 'left'
                        }
                      >
                        <CellRenderer
                          cell={cell}
                          displayType={displayTypes[cell.column.columnDef.meta!.name]}
                          displayAs={props.config.displayAs?.[cell.column.columnDef.meta!.name] as DISPLAY_AS_TYPE}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
              background: ${ThemingVariables.colors.primary[4]};
            `}
          >
            <div
              className={css`
                margin-right: 10px;
              `}
            >
              {getPrePaginationRowModel().rows.length}&nbsp;rows
            </div>
            <GlobalFilter value={globalFilter ?? ''} setGlobalFilter={setGlobalFilter} />
            <div
              className={css`
                flex: 1;
              `}
            />
            <IconButton
              icon={IconCommonArrowUnfold}
              disabled={getCanPreviousPage() === false}
              color={ThemingVariables.colors.text[0]}
              onClick={() => {
                previousPage()
              }}
              className={css`
                margin-left: 10px;
                margin-right: 10px;
                transform: rotate(180deg);
              `}
            />
            {getState().pagination.pageSize * getState().pagination.pageIndex + 1}~
            {getState().pagination.pageSize * (getState().pagination.pageIndex + 1)}
            <IconButton
              icon={IconCommonArrowUnfold}
              disabled={getCanNextPage() === false}
              color={ThemingVariables.colors.text[0]}
              onClick={() => {
                nextPage()
              }}
              className={css`
                margin-left: 10px;
              `}
            />
          </div>
        </div>
      </>
    )
  }
}
