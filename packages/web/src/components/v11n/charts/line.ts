import { ComboShape, Type } from '../types'
import type { Chart } from './base'
import { combo } from './combo'

export const line: Chart<Type.LINE> = {
  type: Type.LINE,

  initializeConfig(data, opts) {
    if (opts.cache[Type.COMBO]) {
      return {
        ...opts.cache[Type.COMBO]!,
        groups: opts.cache[Type.COMBO]!.groups.map((group) => ({ ...group, shape: ComboShape.LINE })),
        type: Type.LINE
      }
    }
    return {
      ...combo.initializeConfig(data, opts),
      type: Type.LINE
    }
  },

  Configuration: combo.Configuration,

  Diagram: combo.Diagram
}
