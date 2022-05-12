import React, { useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { objectKeyValueMapperDeep, TelleryTheme, TelleryThemeLight, ThemeContext } from '../styles/index'

export const ThemeProvider: ReactFCWithChildren<{ theme?: TelleryTheme }> = ({
  children,
  theme = TelleryThemeLight
}) => {
  const styleHTML = useMemo(() => {
    const keyValues: string[] = []
    objectKeyValueMapperDeep(TelleryThemeLight, (key, value) => {
      keyValues.push(`${key}: ${value};`)
      return key
    })
    return keyValues.join('\n')
  }, [])

  return (
    <>
      <Helmet>
        <style type="text/css">
          {`
            :root {
              ${styleHTML}
            }
          `}
        </style>
      </Helmet>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </>
  )
}
