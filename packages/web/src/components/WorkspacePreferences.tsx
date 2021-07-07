import { useWorkspaceDetail, useWorkspaceUpdate } from '@app/hooks/api'
import { ThemingVariables } from '@app/styles'
import type { Workspace } from '@app/types'
import { fileLoader } from '@app/utils'
import { uploadFile } from '@app/utils/upload'
import { css } from '@emotion/css'
import { pick } from 'lodash'
import { useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormButton } from './kit/FormButton'
import FormError from './kit/FormError'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'

export function WorkspacePreferences(props: { onClose(): void }) {
  const { data: workspace } = useWorkspaceDetail()
  const { register, reset, getValues, setValue, handleSubmit } = useForm<Pick<Workspace, 'avatar' | 'name'>>({
    defaultValues: pick(workspace, ['avatar', 'name']),
    mode: 'all'
  })
  useEffect(() => {
    reset(pick(workspace, ['avatar', 'name']))
  }, [workspace, reset])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleWorkspaceUpdate = useWorkspaceUpdate()
  const { onClose } = props
  useEffect(() => {
    if (handleWorkspaceUpdate.status === 'success') {
      onClose()
    }
  }, [handleWorkspaceUpdate.status, onClose])

  return (
    <form
      className={css`
        flex: 1;
        height: 100%;
        padding: 30px 32px 16px;
        display: flex;
        flex-direction: column;
      `}
      onSubmit={handleSubmit(handleWorkspaceUpdate.execute)}
    >
      <h2
        className={css`
          font-weight: 600;
          font-size: 16px;
          line-height: 19px;
          margin: 0;
          color: ${ThemingVariables.colors.text[0]};
        `}
      >
        Workspace Preferences
      </h2>
      <div
        className={css`
          padding: 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid ${ThemingVariables.colors.gray[1]};
          margin-bottom: 20px;
        `}
      >
        <img
          src={getValues().avatar}
          className={css`
            width: 70px;
            height: 70px;
            background: ${ThemingVariables.colors.gray[1]};
            border-radius: 16px;
          `}
        />
        <input
          type="file"
          className={css`
            display: none;
          `}
          accept="image/*"
          ref={fileInputRef}
          onChange={async (e) => {
            const file = e.target.files?.item(0)
            if (!file || !workspace) {
              return
            }
            const { key } = await uploadFile(file, workspace.id)
            setValue('avatar', fileLoader({ src: key, workspaceId: workspace.id }))
          }}
        />
        <FormButton
          type="button"
          variant="secondary"
          onClick={() => {
            fileInputRef.current?.click()
          }}
        >
          Upload Photo
        </FormButton>
      </div>
      <FormLabel>Name</FormLabel>
      <FormInput {...register('name')} />
      <div
        className={css`
          flex: 1;
        `}
      />
      <FormError message={handleWorkspaceUpdate.error?.response?.data.errMsg} />
      <FormButton
        type="submit"
        variant="primary"
        className={css`
          width: 100%;
          margin-top: 5px;
        `}
        disabled={handleWorkspaceUpdate.status === 'pending'}
      >
        Update
      </FormButton>
    </form>
  )
}
