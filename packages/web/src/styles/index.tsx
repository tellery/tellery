import React, { useContext } from 'react'
import { kebabCase, cloneDeep } from 'lodash'
export interface TelleryTheme {
  colors: {
    text: string[]
    gray: string[]
    selection: string[]
    primary: string[]
    positive: string[]
    negative: string[]
    warning: string[]
    visualization: string[]
    visualizationOther: string
  }
  boxShadows: string[]
}

/**
 * @see https://www.figma.com/file/uwiGCVNaUZfcKoFn2iSmus/Tellery-Style-Guide
 */
export const TelleryThemeLight: TelleryTheme = {
  colors: {
    text: ['#333333', '#999999', '#CCCCCC'],
    gray: ['#BABABA', '#DEDEDE', '#EFEFEF', '#F7F7F7', '#FBFBFB', '#FFFFFF'],
    primary: ['#002072', '#002FA7', '#ADBCE3', '#D6DEF1', '#EBEEF8', '#F5F7FB'],
    selection: ['rgba(214, 222, 241, 0.5)'],
    positive: ['#53C556', '#D4F0D5'],
    negative: ['#FF5959', '#FFD5D5'],
    warning: ['#F9C226', '#FDEFC8'],
    // https://blueprintjs.com/docs/#core/colors.extended-colors
    visualization: [
      '#669EFF',
      '#62D96B',
      '#FFC940',
      '#FF6E4A',
      '#C274C2',
      '#14CCBD',
      '#FF66A1',
      '#D1F26D',
      '#C99765',
      '#AD99FF'
    ],
    visualizationOther: '#BFCCD6'
  },
  boxShadows: ['0px 1px 4px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.08), 0px 4px 12px rgba(0, 0, 0, 0.16)']
}

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

export function objectKeyValueMapperDeep<T = {}>(obj: T, iterator: (key: string, value: string) => string) {
  const variablesMap: T = cloneDeep(obj)

  function recurse(obj: DeepPartial<T>, current: DeepPartial<T>, prefix: string) {
    for (const key in obj) {
      const value = obj[key] as unknown as DeepPartial<T>
      if (value !== undefined) {
        if (typeof value === 'object') {
          recurse(value, current[key]! as unknown as DeepPartial<T>, `${prefix}-${kebabCase(key)}`)
        } else {
          current[key] = iterator(`${prefix}-${kebabCase(key)}`, value)
        }
      }
    }
  }

  recurse(obj, variablesMap, '-')

  return variablesMap as T
}

export const ThemingVariables = objectKeyValueMapperDeep(TelleryThemeLight, (key, _value) => `var(${key})`)

export const ThemeContext = React.createContext<TelleryTheme>(TelleryThemeLight)

export const useTheme = () => {
  const theme = useContext(ThemeContext)
  return theme
}
