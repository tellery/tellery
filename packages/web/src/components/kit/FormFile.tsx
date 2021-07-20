import { css } from '@emotion/css'
import { ReactNode, useRef } from 'react'
import { FormButton } from './FormButton'

export default function FormFile(props: {
  variant: 'primary' | 'secondary' | 'danger'
  onChange: (file?: File) => void
  disabled?: boolean
  children?: ReactNode
  className?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        type="file"
        className={css`
          display: none;
        `}
        ref={fileInputRef}
        onChange={async (e) => {
          const file = e.target.files?.item(0)
          props.onChange(file ?? undefined)
        }}
      />
      <FormButton
        type="button"
        variant={props.variant}
        onClick={() => {
          fileInputRef.current?.click()
        }}
        disabled={props.disabled}
        className={props.className}
      >
        {props.children || 'Upload File'}
      </FormButton>
    </>
  )
}
