import { ComboShape, Type } from '../types'
import type { Chart } from './base'
import { combo } from './combo'

export const bar: Chart<Type.BAR> = {
  type: Type.BAR,

  initializeConfig(data, opts) {
    if (opts.cache[Type.COMBO]) {
      return {
        ...opts.cache[Type.COMBO]!,
        groups: opts.cache[Type.COMBO]!.groups.map((group) => ({ ...group, shape: ComboShape.BAR })),
        type: Type.BAR
      }
    }
    return {
      ...combo.initializeConfig(data, opts),
      type: Type.BAR
    }
  },

  Configuration: combo.Configuration,

  Diagram: combo.Diagram
}
