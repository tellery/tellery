import { css, cx } from '@emotion/css'
import React, { useCallback } from 'react'
import { IconCommonArrowUnfold } from 'assets/icons'
import IconButton from './kit/IconButton'

export const ToggleControl: React.FC<{
  className?: string
  value: boolean
  onChange(value: boolean): void
}> = (props) => {
  const { onChange, value } = props
  const handleClick = useCallback(() => {
    onChange(!props.value)
  }, [props.value, onChange])

  return (
    <IconButton
      icon={IconCommonArrowUnfold}
      className={cx(
        value &&
          css`
            transform: rotate(90deg);
          `,
        css`
          cursor: pointer;
          transition: transform 250ms ease;
        `,
        props.className
      )}
      onClick={handleClick}
    />
  )
}
