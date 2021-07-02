import { ComboShape, Type } from '../types'
import type { Chart } from './base'
import { combo } from './combo'

export const area: Chart<Type.AREA> = {
  type: Type.AREA,

  initializeConfig(data, cache) {
    if (cache[Type.COMBO]) {
      return {
        ...cache[Type.COMBO]!,
        groups: cache[Type.COMBO]!.groups.map((group) => ({ ...group, shape: ComboShape.AREA })),
        type: Type.AREA
      }
    }
    return {
      ...combo.initializeConfig(data, cache),
      type: Type.AREA
    }
  },

  Configuration: combo.Configuration,

  Diagram: combo.Diagram
}
