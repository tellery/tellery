import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import React from 'react'
import { useForm } from 'react-hook-form'
import { EditorPopover } from '../EditorPopover'

export const EmbedBlockPopover: React.FC<{
  open: boolean
  setOpen: (value: boolean) => void
  referenceElement: HTMLElement | null
  onSubmit: (value: any) => void
}> = ({ open, setOpen, referenceElement, onSubmit }) => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm()

  return (
    <EditorPopover
      open={open}
      setOpen={setOpen}
      placement="bottom"
      referenceElement={referenceElement}
      disableClickThrough
      lockBodyScroll
    >
      <div
        className={css`
          outline: none;
          background: ${ThemingVariables.colors.gray[5]};
          box-shadow: ${ThemingVariables.boxShadows[0]};
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          max-height: 200px;
          width: 280px;
          overflow-x: hidden;
          overflow-y: auto;
          user-select: none;
          padding: 8px;
          font-weight: normal;
          & * + * {
            margin-top: 2px;
          }
          padding: 20px;
        `}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <input
            autoFocus
            {...register('src', { required: true })}
            className={css`
              outline: none;
              border-radius: 8px;
              width: 100%;
              border: 1px solid ${ThemingVariables.colors.gray[1]};
              padding: 10px 15px;
              font-size: 14px;
              color: ${ThemingVariables.colors.text[0]};
            `}
            onPaste={(e) => e.stopPropagation()}
            placeholder="Paste a link..."
          />
        </form>
      </div>
    </EditorPopover>
  )
}
