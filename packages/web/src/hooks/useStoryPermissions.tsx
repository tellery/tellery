import { useBlockSuspense } from '@app/hooks/api'
import type { Story } from '@app/types'
import { useMemo } from 'react'
import { useLoggedUser } from './useAuth'

export const useStoryPermissions = (storyId: string) => {
  const user = useLoggedUser()
  const block = useBlockSuspense<Story>(storyId)
  const locked = !!block.format?.locked

  const canWrite = useMemo(() => {
    if (!block || !user) return false
    const permissions = block.permissions
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
      canWrite,
      locked,
      readonly: !canWrite || locked
    }),
    [canWrite, locked]
  )
}
