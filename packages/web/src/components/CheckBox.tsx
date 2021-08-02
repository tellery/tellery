import { css, cx } from '@emotion/css'
import { useCallback } from 'react'
import { IconCommonCheckboxBlank, IconCommonCheckboxFill } from '@app/assets/icons'
import { ThemingVariables } from '@app/styles'

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
    <IconCommonCheckboxFill color={ThemingVariables.colors.gray[1]} className={className} onClick={handleClick} />
  ) : (
    <IconCommonCheckboxBlank color={ThemingVariables.colors.gray[1]} className={className} onClick={handleClick} />
  )
}
