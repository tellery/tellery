import { useWorkspace } from '@app/context/workspace'
import { useAsync } from '@app/hooks'
import type { User } from '@app/hooks/api'
import { useAuth } from '@app/hooks/useAuth'
import { ThemingVariables } from '@app/styles'
import { fileLoader } from '@app/utils'
import { uploadFile } from '@app/utils/upload'
import { css } from '@emotion/css'
import { ErrorMessage } from '@hookform/error-message'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import { FormButton } from './kit/FormButton'
import FormError from './kit/FormError'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'

export default function UserAccount(props: { onClose(): void }) {
  const { user } = useAuth()
  const workspace = useWorkspace()
  const auth = useAuth()
  const handleLogoutUser = useAsync(auth.logout)
  const handleUpdateUser = useAsync(auth.update)
  const {
    register,
    reset,
    getValues,
    setValue,
    formState: { errors },
    handleSubmit
  } = useForm<User & { currentPassword?: string; newPassword?: string; repeatPassword?: string }>({
    defaultValues: user,
    mode: 'all'
  })
  useEffect(() => {
    reset(user)
  }, [user, reset])
  const history = useHistory()
  const { onClose } = props
  useEffect(() => {
    if (handleUpdateUser.status === 'success') {
      onClose()
    }
  }, [handleUpdateUser.status, onClose])
  useEffect(() => {
    if (handleLogoutUser.status === 'success') {
      history.push('/login')
    }
  }, [handleLogoutUser.status, history])
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <form
      className={css`
        flex: 1;
        padding: 30px 32px 16px;
      `}
      onSubmit={handleSubmit(handleUpdateUser.execute)}
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
        Account
      </h2>
      <div
        className={css`
          padding: 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid ${ThemingVariables.colors.gray[1]};
        `}
      >
        <img
          src={getValues().avatar}
          className={css`
            width: 70px;
            height: 70px;
            background: ${ThemingVariables.colors.gray[1]};
            border-radius: 50%;
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
            if (!file) {
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
      <div
        className={css`
          margin-top: 16px;
        `}
      >
        <FormLabel>Name</FormLabel>
        <FormInput {...register('name', { required: 'required' })} error={errors.name} />
        <ErrorMessage errors={errors} name="name" render={FormError} />
      </div>
      {user?.status === 'active' ? (
        <div
          className={css`
            margin-top: 16px;
          `}
        >
          <FormLabel>Current password</FormLabel>
          <FormInput {...register('currentPassword')} type="password" error={errors.currentPassword} />
          <ErrorMessage errors={errors} name="currentPassword" render={FormError} />
        </div>
      ) : null}
      <div
        className={css`
          margin-top: 16px;
        `}
      >
        <FormLabel>New password</FormLabel>
        <FormInput
          {...register('newPassword', {
            minLength: { value: 8, message: 'min 8 chars' },
            maxLength: { value: 25, message: 'max 25 chars' },
            validate: (v) =>
              v
                ? /[a-z]+/.test(v)
                  ? /[A-Z]+/.test(v)
                    ? /[0-9]+/.test(v)
                      ? true
                      : 'at least a number'
                    : 'at least an uppercase char'
                  : 'at least a lowercase char'
                : true
          })}
          type="password"
          error={errors.newPassword}
        />
        <ErrorMessage errors={errors} name="newPassword" render={FormError} />
      </div>
      <div
        className={css`
          margin-top: 16px;
        `}
      >
        <FormLabel>Repeat password</FormLabel>
        <FormInput
          {...register('repeatPassword', {
            validate: (v) => (v === getValues().newPassword ? true : 'password mismatch')
          })}
          type="password"
          error={errors.repeatPassword}
        />
        <ErrorMessage errors={errors} name="repeatPassword" render={FormError} />
      </div>
      <div
        className={css`
          display: flex;
          margin-top: 48px;
        `}
      >
        <FormButton
          type="button"
          variant="secondary"
          className={css`
            flex: 1;
            margin-right: 20px;
          `}
          onClick={() => {
            if (confirm('Logout ?')) {
              handleLogoutUser.execute()
            }
          }}
          disabled={handleLogoutUser.status === 'pending'}
        >
          Logout
        </FormButton>
        <FormButton
          type="submit"
          variant="primary"
          className={css`
            flex: 1;
          `}
          disabled={handleUpdateUser.status === 'pending'}
        >
          Update
        </FormButton>
      </div>
      <FormError message={handleUpdateUser.error?.response?.data.errMsg} />
    </form>
  )
}
