import type { User } from '@app/hooks/api'
import type { Editor, Story } from '@app/types'
import { useMemo } from 'react'

export const usePermissions = (block?: Editor.BaseBlock, user?: User) => {
  const canWrite = useMemo(() => {
    if (!block || !user) return false
    const permissions = (block as Story).permissions
    return permissions?.some((permission) => {
      return (
        permission.role === 'manager' &&
        ((permission.type === 'workspace' && permission.role === 'manager') ||
          (permission.type === 'user' && permission.id === user.id))
      )
    })
  }, [block, user])

  return useMemo(
    () => ({
      canWrite
    }),
    [canWrite]
  )
}
