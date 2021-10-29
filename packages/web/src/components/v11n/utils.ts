import i18n from '@app/i18n'
import dayjs from 'dayjs'

import { DisplayType } from './types'

const numberFormat = Intl.NumberFormat(i18n.language, { maximumFractionDigits: 17 })

export function formatDateTime(time: number | string | Date): string {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

export function formatTime(time: number | string | Date): string {
  // return dayjs(time).format('HH:mm:ss') TODO: change in future
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

export function formatDate(time: number | string | Date): string {
  return dayjs(time).format('YYYY-MM-DD')
}

export function formatRecord(value: unknown, type?: DisplayType, noNumberSplitter = false): string {
  if (value === null) {
    return 'null'
  }
  if (type === DisplayType.DATETIME) {
    return formatDateTime(new Date(value as number))
  }
  if (type === DisplayType.DATE) {
    return formatDate(new Date(value as number))
  }
  if (type === DisplayType.TIME) {
    return formatTime(new Date(value as number))
  }
  if (isNumeric(type) && typeof value === 'number') {
    return noNumberSplitter ? value.toString() : numberFormat.format(value)
  }
  return String(value)
}

export function formatNumber(value: number) {
  if (value === Infinity || value === -Infinity) {
    return value.toString()
  }
  const isNegative = value < 0
  let newValue = Math.abs(value)
  const suffixes = ['', 'K', 'M', 'B', 'T', 'P', 'E']
  let suffixNum = 0
  while (newValue >= 1000) {
    newValue /= 1000
    suffixNum++
  }
  return `${isNegative ? '-' : ''}${
    Number.isInteger(newValue) ? newValue : newValue.toPrecision(3).replace(/\.?0+$/, '')
  }${suffixes[suffixNum]}`
}

function getAvg(arr: number[]) {
  const total = arr.reduce((acc, c) => acc + c, 0)
  return total / arr.length
}

function getSum(arr: number[]) {
  return arr.reduce((acc, c) => acc + c, 0)
}

export function createTrend<T extends { [key: string]: number }>(data: T[], xKey: keyof T, yKey: keyof T) {
  const xData = data.map((value) => value[xKey])
  const yData = data.map((value) => value[yKey])

  // average of X values and Y values
  const xMean = getAvg(xData)
  const yMean = getAvg(yData)

  // Subtract X or Y mean from corresponding axis value
  const xMinusxMean = xData.map((val) => val - xMean)
  const yMinusyMean = yData.map((val) => val - yMean)

  const xMinusxMeanSq = xMinusxMean.map((val) => Math.pow(val, 2))

  const xy: number[] = []
  for (let x = 0; x < data.length; x++) {
    xy.push(xMinusxMean[x] * yMinusyMean[x])
  }

  // const xy = xMinusxMean.map((val, index) => val * yMinusyMean[index]);

  const xySum = getSum(xy)

  // b1 is the slope
  const b1 = xySum / getSum(xMinusxMeanSq)
  // b0 is the start of the slope on the Y axis
  const b0 = yMean - b1 * xMean

  return {
    slope: b1,
    yStart: b0,
    calcY: (x: number) => b0 + b1 * x
  }
}

export function isNumeric(displayType?: DisplayType) {
  return (
    displayType &&
    [
      DisplayType.FLOAT,
      DisplayType.BIGINT,
      DisplayType.INT,
      DisplayType.DATETIME,
      DisplayType.DATE,
      DisplayType.TIME
    ].includes(displayType)
  )
}

export function isTimeSeries(displayType?: DisplayType) {
  return displayType && [DisplayType.DATETIME, DisplayType.DATE, DisplayType.TIME].includes(displayType)
}
