import React from 'react'
import _DetectableOverflow from 'react-detectable-overflow'

export const DetectableOverflow: ReactFCWithChildren = ({ children, ...rest }) => {
  const Component = _DetectableOverflow
  return <Component {...rest}>{children}</Component>
}
