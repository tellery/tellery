import React, { useMemo } from 'react'
import { Helmet } from 'react-helmet'
import { ThemingVariables } from '../styles'

function areScrollbarsVisible() {
  const scrollableElem = document.createElement('div')
  const innerElem = document.createElement('div')
  scrollableElem.style.width = '30px'
  scrollableElem.style.height = '30px'
  scrollableElem.style.overflow = 'scroll'
  scrollableElem.style.borderWidth = '0'
  innerElem.style.width = '30px'
  innerElem.style.height = '60px'
  scrollableElem.appendChild(innerElem)
  document.body.appendChild(scrollableElem)
  const diff = scrollableElem.offsetWidth - scrollableElem.clientWidth
  document.body.removeChild(scrollableElem)
  return diff > 0
}

export const CustomizedScrollbarProvider = () => {
  const isScrollBarAlwaysShow = useMemo(() => {
    return areScrollbarsVisible()
  }, [])
  if (isScrollBarAlwaysShow) {
    return (
      <Helmet>
        <style>
          {`
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar {
      background: transparent;
    }
    ::-webkit-scrollbar-track {
      background: ${ThemingVariables.colors.gray[3]};
    }
    ::-webkit-scrollbar-thumb {
      background: ${ThemingVariables.colors.gray[1]};
    }
    ::-webkit-scrollbar-thumb:hover {
      background: ${ThemingVariables.colors.gray[0]};
    }
  `}
        </style>
      </Helmet>
    )
  }
  return null
}
