import React, { useEffect, useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { objectKeyValueMapperDeep, TelleryTheme, TelleryThemeLight, ThemeContext } from '../styles/index'

export const ThemeProvider: React.FC<{ theme?: TelleryTheme }> = ({ children, theme = TelleryThemeLight }) => {
  const styleHTML = useMemo(() => {
    const keyValues: string[] = []
    objectKeyValueMapperDeep(TelleryThemeLight, (key, value) => {
      keyValues.push(`${key}: ${value};`)
      return key
    })
    return keyValues.join('\n')
  }, [])

  useEffect(() => {
    console.log(styleHTML)
  }, [styleHTML])

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
