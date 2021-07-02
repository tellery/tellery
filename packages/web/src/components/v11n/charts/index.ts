import { useMemo } from 'react'

import { Type } from '../types'
import type { Chart } from './base'
import { table } from './table'
import { combo } from './combo'
import { line } from './line'
import { bar } from './bar'
import { area } from './area'
import { pie } from './pie'
import { scatter } from './scatter'
import { number } from './number'

export const charts = {
  [Type.TABLE]: table,
  [Type.COMBO]: combo,
  [Type.LINE]: line,
  [Type.BAR]: bar,
  [Type.AREA]: area,
  [Type.PIE]: pie,
  [Type.SCATTER]: scatter,
  [Type.NUMBER]: number
} as { [T in Type]: Chart<T> }

export function useChart<T extends Type>(type?: T) {
  return useMemo(() => (type ? charts[type] : undefined), [type])
}
