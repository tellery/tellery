import { useAsync } from '@app/hooks'
import { useAuth } from '@app/hooks/useAuth'
import { css } from '@emotion/css'
import { ErrorMessage } from '@hookform/error-message'
import { FormButton } from 'components/kit/FormButton'
import FormError from 'components/kit/FormError'
import FormInput from 'components/kit/FormInput'
import FormLabel from 'components/kit/FormLabel'
import FormModal from 'components/kit/FormModal'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useHistory } from 'react-router-dom'
import isEmail from 'validator/lib/isEmail'

export default function Login() {
  const {
    register,
    formState: { errors },
    handleSubmit
  } = useForm<{ email?: string; password?: string }>({})
  const auth = useAuth()
  const handleUserLogin = useAsync(auth.login)

  const history = useHistory()

  useEffect(() => {
    if (handleUserLogin.status === 'success') {
      history.push('/')
    }
  }, [handleUserLogin.status, history])

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
              <FormLabel>E-mail</FormLabel>
              <FormInput
                type="text"
                {...register('email', {
                  required: 'required',
                  validate: (v) => (v && isEmail(v) ? true : 'email format error')
                })}
                error={errors.email}
              />
              <ErrorMessage errors={errors} name="email" render={FormError} />
            </div>
            <div>
              <FormLabel>Password</FormLabel>
              <FormInput type="password" {...register('password')} error={errors.password} />
              <ErrorMessage errors={errors} name="password" render={FormError} />
            </div>
          </div>
        }
        footer={
          <>
            <div
              className={css`
                display: flex;
              `}
            >
              <FormButton
                type="button"
                variant="secondary"
                className={css`
                  flex: 1;
                  margin-right: 20px;
                `}
                disabled={handleUserLogin.status === 'pending'}
                onClick={() => {
                  history.push('/register')
                }}
              >
                Sign up
              </FormButton>
              <FormButton
                type="submit"
                variant="primary"
                className={css`
                  flex: 1;
                `}
                disabled={handleUserLogin.status === 'pending'}
              >
                Login
              </FormButton>
            </div>
            <FormError message={handleUserLogin.error?.response?.data.errMsg} />
          </>
        }
      />
    </div>
  )
}
