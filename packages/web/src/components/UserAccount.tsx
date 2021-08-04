import { useWorkspace } from '@app/hooks/useWorkspace'
import { useAsync } from '@app/hooks'
import type { User } from '@app/hooks/api'
import { useAuth } from '@app/hooks/useAuth'
import { ThemingVariables } from '@app/styles'
import { fileLoader } from '@app/utils'
import { uploadFile } from '@app/utils/upload'
import { css } from '@emotion/css'
import { ErrorMessage } from '@hookform/error-message'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormButton } from './kit/FormButton'
import FormError from './kit/FormError'
import FormFileButton from './kit/FormFileButton'
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
    watch,
    setValue,
    formState: { errors },
    handleSubmit
  } = useForm<User & { currentPassword?: string; newPassword?: string; repeatPassword?: string }>({
    defaultValues: user,
    mode: 'onBlur'
  })
  useEffect(() => {
    reset(user)
  }, [user, reset])
  const { onClose } = props
  useEffect(() => {
    if (handleUpdateUser.status === 'success') {
      onClose()
    }
  }, [handleUpdateUser.status, onClose])
  useEffect(() => {
    if (handleLogoutUser.status === 'success') {
      window.location.href = '/login'
    }
  }, [handleLogoutUser.status])
  const avatar = watch('avatar')
  const newPassword = watch('newPassword')

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
          src={avatar}
          className={css`
            width: 70px;
            height: 70px;
            background: ${ThemingVariables.colors.gray[1]};
            border-radius: 50%;
          `}
        />
        <FormFileButton
          accept="image/*"
          variant="secondary"
          onChange={async (file) => {
            if (!file) {
              return
            }
            const { key } = await uploadFile(file, workspace.id)
            setValue('avatar', fileLoader({ src: key, workspaceId: workspace.id }))
          }}
        >
          Upload Photo
        </FormFileButton>
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
          <FormInput
            {...register('currentPassword')}
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword}
          />
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
          autoComplete="new-password"
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
            validate: (v) => (v === newPassword ? true : 'password mismatch')
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
