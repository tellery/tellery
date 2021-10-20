import { request, updateUser, userConfirm, userLogin, userLogout } from '@app/api'
import type { User } from '@app/hooks/api'
import { tracker } from '@app/utils/openReplay'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import invariant from 'tiny-invariant'

export function useProvideAuth() {
  const [user, setUser] = useState<User>()

  const login = useCallback(async (args: { email: string; password: string }) => {
    return userLogin(args).then((user) => {
      setUser(user)
    })
  }, [])

  const logout = useCallback(async () => {
    return userLogout().then((user) => {
      setUser(user)
    })
  }, [])

  const confirm = useCallback((args: { code: string }) => {
    return userConfirm(args)
  }, [])

  const update = useCallback(
    (args: {
      avatar?: string | undefined
      name?: string | undefined
      newPassword?: string | undefined
      currentPassword?: string | undefined
    }) => {
      return updateUser(args).then((res) => {
        setUser(res)
      })
    },
    []
  )

  const autoLogin = useCallback(async () => {
    const { data } = await request.post<User>('/api/users/me')
    setUser(data)
  }, [])

  useEffect(() => {
    user?.name && tracker?.setUserID(user?.name)
  }, [user])

  return {
    user,
    login,
    logout,
    confirm,
    autoLogin,
    update,
    setUser
  }
}

export const authContext = createContext<ReturnType<typeof useProvideAuth> | null>(null)

export function useAuth() {
  const context = useContext(authContext)
  invariant(context, 'context must use in provider')
  return context
}

export function useLoggedUser() {
  const context = useContext(authContext)
  invariant(context, 'context must use in provider')
  invariant(context.user, 'context must use in provider')

  return context.user
}
