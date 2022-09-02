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
    visualizationGradientColors: {
      blue: string[]
      'blue-reverse': string[]
      orange: string[]
      'orange-reverse': string[]
      hue: string[]
      'hue-reverse': string[]
    }
  }
  boxShadows: string[]
  // breakpoints: number[]
}

export const breakpoints = [576, 768, 992, 1200]

export const mq = breakpoints.map((bp) => `@media (min-width: ${bp}px)`)

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
      '#5b8ff9',
      '#61ddaa',
      '#65789B',
      '#F6BD16',
      '#7262fd',
      '#78D3F8',
      '#9661BC',
      '#F6903D',
      '#008685',
      '#F08BB4'
    ],
    visualizationGradientColors: {
      blue: ['#ffffff', '#d6e3fd', '#adc7fc', '#84abfb', '#5b8ff9'],
      'blue-reverse': ['#5b8ff9', '#84abfb', '#adc7fc', '#d6e3fd', '#ffffff'],
      orange: ['#ffffff', '#fde3ce', '#fbc89e', '#f8ac6d', '#f6903d'],
      'orange-reverse': ['#f6903d', '#f8ac6d', '#fbc89e', '#fde3ce', '#ffffff'],
      hue: ['#61ddaa', '#7ee26b', '#dde775', '#eca580', '#f08bb4'],
      'hue-reverse': ['#f08bb4', '#eca580', '#dde775', '#7ee26b', '#61ddaa']
    },
    visualizationOther: '#DEDEDE',
    visualizationOtherHighlight: '#999999'
  },
  boxShadows: ['0px 1px 4px rgba(0, 0, 0, 0.08), 0px 1px 2px rgba(0, 0, 0, 0.08), 0px 4px 12px rgba(0, 0, 0, 0.16)']
  // breakpoints: [576, 768, 992, 1200]
}

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

export function objectKeyValueMapperDeep<T = {}>(obj: T, iterator: (key: string, value: string) => string) {
  const variablesMap: T = cloneDeep(obj)

  function iter(obj: DeepPartial<T>, current: DeepPartial<T>, prefix: string) {
    for (const key in obj) {
      const value = obj[key] as unknown as DeepPartial<T>
      if (value !== undefined) {
        if (typeof value === 'object') {
          iter(value, current[key]! as unknown as DeepPartial<T>, `${prefix}-${kebabCase(key)}`)
        } else {
          current[key] = iterator(`${prefix}-${kebabCase(key)}`, value)
        }
      }
    }
  }

  iter(obj, variablesMap, '-')

  return variablesMap as T
}

export const ThemingVariables = objectKeyValueMapperDeep(TelleryThemeLight, (key, _value) => `var(${key})`)

export const ThemeContext = React.createContext<TelleryTheme>(TelleryThemeLight)

export const useTheme = () => {
  const theme = useContext(ThemeContext)
  return theme
}
