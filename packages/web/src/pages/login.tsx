import { useAsync } from '@app/hooks'
import { useAuth } from '@app/hooks/useAuth'
import { css } from '@emotion/css'
import { ErrorMessage } from '@hookform/error-message'
import { FormButton } from '@app/components/kit/FormButton'
import FormError from '@app/components/kit/FormError'
import FormInput from '@app/components/kit/FormInput'
import FormLabel from '@app/components/kit/FormLabel'
import FormModal from '@app/components/kit/FormModal'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import isEmail from 'validator/lib/isEmail'

export default function Login() {
  const {
    register,
    formState: { errors },
    handleSubmit,
    watch
  } = useForm<{ email?: string; password?: string }>({ mode: 'onBlur' })
  const auth = useAuth()
  const handleUserLogin = useAsync(auth.login)
  const history = useHistory()
  useEffect(() => {
    if (handleUserLogin.status === 'success') {
      const callback = new URLSearchParams(history.location.search).get('callback')
      if (callback) {
        window.location.href = callback
      } else {
        history.push('/')
      }
    }
  }, [handleUserLogin.status, history])
  const email = watch('email')
  const password = watch('password')

  return (
    <div
      className={css`
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
      `}
    >
      <FormModal
        onSubmit={handleSubmit(handleUserLogin.execute)}
        title="Welcome to Tellery"
        body={
          <div
            className={css`
              & > div + div {
                margin-top: 20px;
              }
            `}
          >
            <div>
              <FormLabel>Email</FormLabel>
              <FormInput
                type="email"
                {...register('email', {
                  required: 'required',
                  validate: (v) => (v && isEmail(v) ? true : 'email format error')
                })}
                autoFocus={true}
                error={errors.email}
              />
              <ErrorMessage errors={errors} name="email" render={FormError} />
            </div>
            <div>
              <FormLabel>Password</FormLabel>
              <FormInput type="password" {...register('password')} error={errors.password} />
              <ErrorMessage errors={errors} name="password" render={FormError} />
              <FormError message={handleUserLogin.error?.response?.data.errMsg} />
            </div>
          </div>
        }
        footer={
          <FormButton
            type="submit"
            variant="primary"
            className={css`
              width: 100%;
            `}
            disabled={!email || !password}
            loading={handleUserLogin.status === 'pending'}
          >
            Login
          </FormButton>
        }
      />
    </div>
  )
}
