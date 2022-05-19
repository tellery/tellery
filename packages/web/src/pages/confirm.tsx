import { CircularLoading } from '@app/components/CircularLoading'
import FormModal from '@app/components/kit/FormModal'
import UserPassword from '@app/components/UserPassword'
import { useAsync } from '@app/hooks'
import { useAuth } from '@app/hooks/useAuth'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function Confirm() {
  const location = useLocation()
  const navigate = useNavigate()
  const code = useMemo(() => new URLSearchParams(location.search).get('code') || undefined, [location.search])
  const auth = useAuth()
  const handleUserConfirm = useAsync(auth.confirm)

  useEffect(() => {
    if (code) {
      handleUserConfirm.execute({ code })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  useEffect(() => {
    if (handleUserConfirm.status === 'success') {
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
      {handleUserConfirm.status === 'success' ? (
        <FormModal
          title="Welcome to Tellery"
          subtitle="Choose your password to continue"
          body={
            <UserPassword
              onClose={() => {
                navigate('/stories')
              }}
              confirmText="Confirm"
            />
          }
        />
      ) : (
        <CircularLoading size={40} color={ThemingVariables.colors.gray[5]} />
      )}
    </div>
  )
}
