import React, { useContext } from 'react'
import { kebabCase, cloneDeep } from 'lodash'
export interface TelleryTheme {
  colors: {
    palette: {
      blue: string
      cyan: string
      gray: string
      yellow: string
      purple: string
      orange: string
      pink: string
      green: string
    }
    text: string[]
    gray: string[]
    code: string[]
    selection: string[]
    primary: string[]
    positive: string[]
    negative: string[]
    warning: string[]
    visualization: string[]
    visualizationOther: string
    visualizationOtherHighlight: string
  }
  boxShadows: string[]
}

/**
 * @see https://www.figma.com/file/uwiGCVNaUZfcKoFn2iSmus/Tellery-Style-Guide
 */
export const TelleryThemeLight: TelleryTheme = {
  colors: {
    palette: {
      blue: '#5B8FF9',
      cyan: '#61DDAA',
      gray: '#65789B',
      yellow: '#F6BD16',
      purple: '#7262fd',
      orange: '#F6903D',
      pink: '#F08BB4',
      green: '#008685'
    },
    text: ['#333333', '#999999', '#CCCCCC'],
    gray: ['#BABABA', '#DEDEDE', '#EFEFEF', '#F7F7F7', '#FBFBFB', '#FFFFFF'],
    primary: ['#002072', '#002FA7', '#ADBCE3', '#D6DEF1', '#EBEEF8', '#F5F7FB'],
    code: ['#FF6E4A'],
    selection: ['rgba(214, 222, 241, 0.5)'],
    positive: ['#53C556', '#D4F0D5'],
    negative: ['#FF5959', '#FFD5D5'],
    warning: ['#F9C226', '#FDEFC8'],
    // https://blueprintjs.com/docs/#core/colors.extended-colors
    visualization: [
      '#5B8FF9',
      '#61DDAA',
      '#65789B',
      '#F6BD16',
      '#7262fd',
      '#78D3F8',
      '#9661BC',
      '#F6903D',
      '#008685',
      '#F08BB4'
    ],
    visualizationOther: '#DEDEDE',
    visualizationOtherHighlight: '#999999'
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
