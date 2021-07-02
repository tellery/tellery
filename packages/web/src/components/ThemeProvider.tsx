import React from 'react'
import { useIsomorphicLayoutEffect } from '@app/hooks/useIsomorphicLayoutEffect'
import { TelleryTheme, TelleryThemeLight, objectKeyValueMapperDeep, ThemeContext } from '../styles/index'

export const ThemeProvider: React.FC<{ theme?: TelleryTheme }> = ({ children, theme = TelleryThemeLight }) => {
  useIsomorphicLayoutEffect(() => {
    objectKeyValueMapperDeep(TelleryThemeLight, (key, value) => {
      document.body.style.setProperty(key, value)
      return key
    })
  }, [theme])
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}
