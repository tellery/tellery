import { ComboShape, Type } from '../types'
import type { Chart } from './base'
import { combo } from './combo'

export const line: Chart<Type.LINE> = {
  type: Type.LINE,

  initializeConfig(data, cache) {
    if (cache[Type.COMBO]) {
      return {
        ...cache[Type.COMBO]!,
        groups: cache[Type.COMBO]!.groups.map((group) => ({ ...group, shape: ComboShape.LINE })),
        type: Type.LINE
      }
    }
    return {
      ...combo.initializeConfig(data, cache),
      type: Type.LINE
    }
  },

  Configuration: combo.Configuration,

  Diagram: combo.Diagram
}
