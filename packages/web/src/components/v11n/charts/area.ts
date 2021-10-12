import { ComboShape, Type } from '../types'
import type { Chart } from './base'
import { combo } from './combo'

export const area: Chart<Type.AREA> = {
  type: Type.AREA,

  initializeConfig(data, opts) {
    if (opts.cache[Type.COMBO]) {
      return {
        ...opts.cache[Type.COMBO]!,
        groups: opts.cache[Type.COMBO]!.groups.map((group) => ({ ...group, shape: ComboShape.AREA })),
        type: Type.AREA
      }
    }
    return {
      ...combo.initializeConfig(data, opts),
      type: Type.AREA
    }
  },

  Configuration: combo.Configuration,

  Diagram: combo.Diagram
}
