import { css, cx } from '@emotion/css'
import { useCallback } from 'react'
import { IconCommonCheckboxBlank, IconCommonCheckboxFill } from 'assets/icons'
import { ThemingVariables } from 'styles'

export function CheckBox(props: {
  disabled?: boolean
  className?: string
  value: boolean
  onChange(value: boolean): void
}) {
  const { onChange } = props
  const handleClick = useCallback(() => {
    if (props.disabled) return
    onChange(!props.value)
  }, [props.value, props.disabled, onChange])
  const className = cx(
    props.disabled
      ? css`
          cursor: not-allowed;
        `
      : css`
          cursor: pointer;

          &:hover rect {
            fill: ${ThemingVariables.colors.primary[5]};
          }
        `,
    props.className
  )

  return props.value ? (
    <IconCommonCheckboxFill className={className} onClick={handleClick} />
  ) : (
    <IconCommonCheckboxBlank className={className} onClick={handleClick} />
  )
}
