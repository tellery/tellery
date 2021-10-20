import { useAsync } from '@app/hooks'
import type { User } from '@app/hooks/api'
import { useAuth } from '@app/hooks/useAuth'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import { ErrorMessage } from '@hookform/error-message'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { FormButton } from './kit/FormButton'
import FormError from './kit/FormError'
import FormInput from './kit/FormInput'
import FormLabel from './kit/FormLabel'

export default function UserPassword(props: { onClose(): void }) {
  const { user } = useAuth()
  const auth = useAuth()
  const handleUpdateUser = useAsync(auth.update)
  const {
    register,
    reset,
    watch,
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
  const newPassword = watch('newPassword')

  return (
    <form
      className={css`
        flex: 1;
        height: 100%;
        padding: 30px 32px 16px;
        display: flex;
        flex-direction: column;
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
        Password
      </h2>
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
          flex: 1;
        `}
      />
      <div
        className={css`
          display: flex;
          margin-top: 48px;
        `}
      >
        <FormButton
          type="submit"
          variant="primary"
          className={css`
            flex: 1;
          `}
          loading={handleUpdateUser.status === 'pending'}
        >
          Update password
        </FormButton>
      </div>
      <FormError message={(handleUpdateUser.error?.response?.data as any).errMsg} />
    </form>
  )
}
