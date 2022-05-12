import { useAsync } from '@app/hooks'
import { useAuth } from '@app/hooks/useAuth'
import { css } from '@emotion/css'
import { ErrorMessage } from '@hookform/error-message'
import { FormButton } from '@app/components/kit/FormButton'
import FormError from '@app/components/kit/FormError'
import FormInput from '@app/components/kit/FormInput'
import FormLabel from '@app/components/kit/FormLabel'
import FormModal from '@app/components/kit/FormModal'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate } from 'react-router-dom'
import isEmail from 'validator/lib/isEmail'
import { env } from '@app/env'
import { ThemingVariables } from '@app/styles'

const ENC = {
  '+': '-',
  '/': '_',
  '=': '.'
} as Record<string, string>

const DEC = {
  '-': '+',
  _: '/',
  '.': '='
} as Record<string, string>

const encodeState = (state: object) => {
  return btoa(JSON.stringify(state)).replace(/[+/=]/g, (m: string) => ENC[m])
}

const decodeState = (stateString: string) => {
  return JSON.parse(atob(stateString.replace(/[-_.]/g, (m: string) => DEC[m])))
}

export default function Login() {
  const {
    register,
    formState: { errors },
    handleSubmit,
    watch
  } = useForm<{ email: string; password: string }>({ mode: 'onBlur' })
  const auth = useAuth()
  const handleUserLogin = useAsync(auth.login)
  const navigate = useNavigate()
  const location = useLocation()
  const isOauthCallback = location.pathname === '/oauth/callback'
  const [oauthLoading, setOauthLoading] = useState(false)
  const callbackUrl = useRef<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.has('state')) {
      callbackUrl.current = decodeState(params.get('state')!).callbackUrl
    } else {
      callbackUrl.current = params.get('state') ?? params.get('callback')
    }
  }, [location.search])

  const navigateToNext = useCallback(() => {
    if (callbackUrl.current) {
      window.location.href = callbackUrl.current
    } else {
      navigate('/')
    }
  }, [navigate])

  useEffect(() => {
    if (handleUserLogin.status === 'success') {
      navigateToNext()
    }
  }, [handleUserLogin.status, location.search, navigate, navigateToNext])

  useEffect(() => {
    if (isOauthCallback) {
      const code = new URLSearchParams(location.search).get('code')
      if (!code) return
      setOauthLoading(true)
      auth
        .oauthLogin(code)
        .then(() => {
          navigateToNext()
        })
        .finally(() => {
          setOauthLoading(false)
        })
    }
  }, [auth, isOauthCallback, location.search, navigate, navigateToNext])

  const email = watch('email')
  const password = watch('password')

  return (
    <div
      className={css`
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
      `}
    >
      <FormModal
        onSubmit={handleSubmit(handleUserLogin.execute)}
        title="Login to Tellery"
        body={
          <>
            {env.oauth2?.enable && (
              <div
                className={css`
                  margin-bottom: 30px;
                `}
              >
                <a
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  className={css`
                    width: 100%;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${ThemingVariables.colors.primary[5]};
                    text-decoration: none;
                    padding: 6px 0;
                    color: ${ThemingVariables.colors.text[0]};
                    border-radius: 10px;
                    font-size: 14px;
                  `}
                  href={`${env.oauth2.authorizeUrl}&redirect_uri=${encodeURIComponent(
                    `${window.location.protocol}//${window.location.host}/oauth/callback`
                  )}${callbackUrl.current ? `&state=${encodeState({ callbackUrl: callbackUrl.current })}` : ''}`}
                >
                  <img
                    src={env.oauth2.providerIcon}
                    className={css`
                      width: 25px;
                      height: 25px;
                      object-fit: cover;
                      margin-right: 10px;
                      border-radius: 100%;
                    `}
                    title={env.oauth2.providerName}
                  />
                  Login With {env.oauth2.providerName}
                </a>
                <hr
                  className={css`
                    opacity: 0.2;
                  `}
                />
              </div>
            )}
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
                <FormError message={(handleUserLogin.error?.response?.data as any)?.errMsg} />
              </div>
            </div>
          </>
        }
        footer={
          <>
            <FormButton
              type="submit"
              variant="primary"
              className={css`
                width: 100%;
              `}
              disabled={!email || !password}
              loading={handleUserLogin.status === 'pending' || oauthLoading}
            >
              Login
            </FormButton>
          </>
        }
      />
    </div>
  )
}
