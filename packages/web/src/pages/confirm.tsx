import { useAsync } from '@app/hooks'
import { useAuth } from '@app/hooks/useAuth'
import { css } from '@emotion/css'
import { FormButton } from 'components/kit/FormButton'
import FormError from 'components/kit/FormError'
import FormModal from 'components/kit/FormModal'
import { useEffect, useMemo } from 'react'
import { useHistory } from 'react-router-dom'

export default function Confirm() {
  const history = useHistory()
  const code = useMemo(
    () => new URLSearchParams(history.location.search).get('code') || undefined,
    [history.location.search]
  )
  const auth = useAuth()
  const handleUserConfirm = useAsync(auth.confirm)

  useEffect(() => {
    if (handleUserConfirm.status === 'success') {
      history.push('/user')
    }
  }, [handleUserConfirm.status, history])

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
            <FormButton
              type="button"
              variant="primary"
              className={css`
                width: 100%;
              `}
              disabled={!code || handleUserConfirm.status === 'pending'}
              onClick={() => {
                if (code) {
                  handleUserConfirm.execute({ code })
                }
              }}
            >
              Confirm
            </FormButton>
            <FormError message={handleUserConfirm.error?.response?.data.errMsg} />
          </>
        }
      />
    </div>
  )
}
