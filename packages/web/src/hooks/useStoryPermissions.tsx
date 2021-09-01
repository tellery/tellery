import { BlockFormatAtom, BlockPermissionsAtom } from '@app/store/block'
import { useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { useLoggedUser } from './useAuth'

export const useStoryPermissions = (storyId: string) => {
  const user = useLoggedUser()
  const permissons = useRecoilValue(BlockPermissionsAtom(storyId))
  const format = useRecoilValue(BlockFormatAtom(storyId))
  const locked = !!(format as any)?.locked

  const canWrite = useMemo(() => {
    if (!permissons || !user) return false
    return permissons?.some((permission) => {
      return (
        permission.role === 'manager' &&
        ((permission.type === 'workspace' && permission.role === 'manager') ||
          (permission.type === 'user' && permission.id === user.id))
      )
    })
  }, [permissons, user])

  const isPrivate = useMemo(() => {
    return (
      !!permissons?.some((permission) => {
        return permission.type === 'workspace'
      }) === false
    )
  }, [permissons])

  return useMemo(
    () => ({
      canWrite,
      locked,
      readonly: !canWrite || locked,
      isPrivate: isPrivate
    }),
    [canWrite, locked, isPrivate]
  )
}
