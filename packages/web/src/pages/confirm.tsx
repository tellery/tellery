import { useAsync } from '@app/hooks'
import { useAuth } from '@app/hooks/useAuth'
import { css } from '@emotion/css'
import { FormButton } from '@app/components/kit/FormButton'
import FormError from '@app/components/kit/FormError'
import FormModal from '@app/components/kit/FormModal'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Confirm() {
  const location = useLocation()
  const navigate = useNavigate()

  const code = useMemo(() => new URLSearchParams(location.search).get('code') || undefined, [location.search])
  const auth = useAuth()
  const handleUserConfirm = useAsync(auth.confirm)

  useEffect(() => {
    if (handleUserConfirm.status === 'success') {
      navigate('/user')
    }
  }, [handleUserConfirm.status, navigate])

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
        title="Confirm sign up"
        subtitle="We will create an account for you."
        footer={
          <>
            <FormError message={(handleUserConfirm.error?.response?.data as any)?.errMsg} />
            <FormButton
              type="button"
              variant="primary"
              className={css`
                margin-top: 5px;
                width: 100%;
              `}
              disabled={!code}
              loading={handleUserConfirm.status === 'pending'}
              onClick={() => {
                if (code) {
                  handleUserConfirm.execute({ code })
                }
              }}
            >
              Confirm
            </FormButton>
          </>
        }
      />
    </div>
  )
}
