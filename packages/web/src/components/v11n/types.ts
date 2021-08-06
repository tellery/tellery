import type { ScaleType } from '@tellery/recharts/types/util/types'

export enum DisplayType {
  UNKNOWN = 'UNKNOWN',
  STRING = 'STRING',
  INT = 'INT',
  BIGINT = 'BIGINT',
  FLOAT = 'FLOAT',
  BYTES = 'BYTES',
  BOOLEAN = 'BOOLEAN',
  BLOB = 'BLOB',
  DATETIME = 'DATETIME',
  DATE = 'DATE',
  TIME = 'TIME',
  STRUCT = 'STRUCT',
  ARRAY = 'ARRAY'
}

export interface Data {
  errMsg?: string
  fields: readonly { name: string; displayType: DisplayType; sqlType?: string }[]
  records: readonly unknown[][]
}

export enum Type {
  TABLE = 'Table',
  COMBO = 'Combo',
  LINE = 'Line',
  AREA = 'Area',
  BAR = 'Bar',
  PIE = 'Pie',
  SCATTER = 'Scatter',
  NUMBER = 'Number'
}

export enum ComboShape {
  LINE = 'Line',
  BAR = 'Bar',
  AREA = 'Area'
}

export enum ComboStack {
  NONE = 'none',
  STACK = 'stack',
  STACK_100 = 'stack 100%'
}

interface TableConfig {
  type: Type.TABLE
  columnOrder: string[]
  columnVisibility: { [key: string]: boolean }
}

interface ComboConfig<T extends Type = Type.COMBO> {
  type: T
  axises: string[]

  // Data
  xAxises: string[]
  dimensions: string[]
  yAxises: string[]
  y2Axises: string[]

  // Display
  groups: {
    key: 'left' | 'right'
    type: 'linear' | 'monotone' | 'step'
    shape: ComboShape | undefined
    stackType: ComboStack
    connectNulls: boolean
  }[]
  shapes: {
    key: string
    groupId: 'left' | 'right'
    title: string
    color: number
    hasTrendline: boolean
  }[]
  referenceYLabel: string
  referenceYValue: number | undefined
  referenceYAxis: 'left' | 'right'

  // Axis
  xLabel: string
  xType?: 'linear' | 'ordinal'
  yLabel: string
  yScale: ScaleType
  yRangeMin: number | undefined
  yRangeMax: number | undefined
  y2Label: string
  y2Scale: ScaleType
  y2RangeMin: number | undefined
  y2RangeMax: number | undefined
}

interface LineConfig extends ComboConfig<Type.LINE> {}

interface BarConfig extends ComboConfig<Type.BAR> {}

interface AreaConfig extends ComboConfig<Type.AREA> {}

interface PieConfig {
  type: Type.PIE

  // Other
  keys: string[]

  // Data
  dimension: string
  measurement: string
  minPercentage?: number

  // Display
  showLegend: boolean
  showTotal: boolean
  slices: {
    key: string
    title: string
    color: number
  }[]
}

interface ScatterConfig {
  type: Type.SCATTER

  keys: string[]

  // Data
  xAxis: string
  yAxis: string
  color?: string
  size?: string

  // Display
  colors: { key: string; color: number }[]
  referenceXLabel: string
  referenceXValue: number | undefined
  referenceYLabel: string
  referenceYValue: number | undefined

  // Axis
  xLabel: string
  xType?: 'linear' | 'ordinal'
  yLabel: string
  yScale: ScaleType
  yRangeMin: number | undefined
  yRangeMax: number | undefined
}

interface NumberConfig {
  type: Type.NUMBER

  // Other
  columns: string[]

  field: string

  compare?: boolean
  prefix?: string
  suffix?: string
}

export type Config<T extends Type> = T extends Type.TABLE
  ? TableConfig
  : T extends Type.COMBO
  ? ComboConfig
  : T extends Type.LINE
  ? LineConfig
  : T extends Type.BAR
  ? BarConfig
  : T extends Type.AREA
  ? AreaConfig
  : T extends Type.PIE
  ? PieConfig
  : T extends Type.SCATTER
  ? ScatterConfig
  : T extends Type.NUMBER
  ? NumberConfig
  : never
