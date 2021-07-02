import { ComboShape, Type } from '../types'
import type { Chart } from './base'
import { combo } from './combo'

export const bar: Chart<Type.BAR> = {
  type: Type.BAR,

  initializeConfig(data, cache) {
    if (cache[Type.COMBO]) {
      return {
        ...cache[Type.COMBO]!,
        groups: cache[Type.COMBO]!.groups.map((group) => ({ ...group, shape: ComboShape.BAR })),
        type: Type.BAR
      }
    }
    return {
      ...combo.initializeConfig(data, cache),
      type: Type.BAR
    }
  },

  Configuration: combo.Configuration,

  Diagram: combo.Diagram
}
