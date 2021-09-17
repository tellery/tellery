import { request, updateUser, userConfirm, userGenerate, userLogin, userLogout } from '@app/api'
import type { User } from '@app/hooks/api'
import invariant from 'tiny-invariant'
import { createContext, useCallback, useContext, useState } from 'react'
import { useQuery } from 'react-query'
import { useLocation } from 'react-router-dom'
import { useEffect } from 'react-router/node_modules/@types/react'
import { tracker } from '@app/utils/openReplay'

export function useProvideAuth() {
  const location = useLocation()

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

  const generate = useCallback((args: { email: string }) => {
    return userGenerate(args)
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

  useQuery(
    ['user', 'me'],
    async () => {
      const { data } = await request.post<User>('/api/users/me')
      setUser(data)
      return data
    },
    { suspense: false, retry: false, enabled: location.pathname !== '/confirm' }
  )

  useEffect(() => {
    user?.name && tracker?.setUserID(user?.name)
  }, [user])

  return {
    user,
    login,
    logout,
    confirm,
    // generate,
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
