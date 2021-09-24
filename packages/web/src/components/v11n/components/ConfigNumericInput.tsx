import { cx, css } from '@emotion/css'
import { ThemingVariables } from '@app/styles'
import { useEffect, useState } from 'react'

export function ConfigNumericInput(props: {
  value?: number
  onChange(value?: number): void
  min?: number
  max?: number
  className?: string
  placeholder?: string
}) {
  const [value, setValue] = useState('')
  useEffect(() => {
    setValue(props.value?.toString() || '')
  }, [props.value])

  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        setValue(e.target.value.match(/[-+]?[0-9]*[.,]?[0-9]*/)?.[0] || '')
      }}
      onBlur={() => {
        const num = parseFloat(value)
        props.onChange(Number.isNaN(num) ? undefined : num)
      }}
      min={props.min}
      max={props.max}
      className={cx(
        css`
          height: 32px;
          width: 100%;
          border-radius: 4px;
          border: 1px solid transparent;
          outline: none;
          font-style: normal;
          font-weight: normal;
          font-size: 12px;
          line-height: 14px;
          padding: 9px 6px;
          box-sizing: border-box;

          :hover {
            border: 1px solid ${ThemingVariables.colors.primary[2]};
          }
          &::placeholder {
            color: ${ThemingVariables.colors.text[2]};
          }
        `,
        props.className
      )}
      placeholder={props.placeholder || 'placeholder'}
    />
  )
}
