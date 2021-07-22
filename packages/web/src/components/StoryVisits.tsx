import { useLoggedUser } from '@app/hooks/useAuth'
import { css, cx } from '@emotion/css'
import { SocketContext } from '@app/context/socketio'
import { useMgetUsers, useStoryVisits } from '@app/hooks/api'
import React, { useContext, useEffect, useMemo, useState } from 'react'
import { ThemingVariables } from '@app/styles'

export function StoryVisits(props: { storyId: string; className?: string }) {
  const { storyId } = props
  const { data: visits, refetch } = useStoryVisits(props.storyId)
  const { data: usersMap } = useMgetUsers(visits?.map((visit) => visit.userId))
  const socket = useContext(SocketContext)
  const [activeIds, setActiveIds] = useState<string[]>([])
  const user = useLoggedUser()

  const sortedVisits = useMemo(() => {
    if (!visits) return undefined
    const userIndex = visits.findIndex((visit) => visit.userId === user.id)
    if (userIndex !== -1) {
      return [visits[userIndex], ...visits.slice(0, userIndex), ...visits.slice(userIndex + 1)]
    } else {
      return [
        {
          storyId: storyId,
          userId: user.id,
          lastVisitTimestamp: new Date().getTime()
        },
        ...visits
      ]
    }
  }, [storyId, user.id, visits])
  useEffect(() => {
    if (!socket) return
    const onNoti = (data: {
      type: string
      value: {
        event: string
        args: {
          userIds: string[]
          storyId: string
        }
      }
    }) => {
      if (data.value.event === 'activeUsersInStory') {
        if (data.value.args.storyId === storyId) {
          const { userIds } = data.value.args
          userIds && setActiveIds(userIds)
          refetch()
        }
      }
    }
    socket.on('notification', onNoti)
    return () => {
      socket.off('notification', onNoti)
    }
  }, [socket, storyId, setActiveIds, refetch])

  return (
    <div
      className={cx(
        css`
          display: inline-flex;
          flex-direction: row-reverse;
        `,
        props.className
      )}
    >
      {sortedVisits &&
        sortedVisits.length > 1 &&
        sortedVisits.map((_visit, index) => {
          const visit = sortedVisits[sortedVisits.length - index - 1]
          const user = usersMap?.[visit.userId]
          if (!user) return null
          const isActive = activeIds.findIndex((id) => id === user.id) !== -1
          return (
            <div
              key={visit.userId}
              className={css`
                height: 36px;
                width: 36px;
                margin-left: -12px;
                border-radius: 100%;
                overflow: hidden;
                border: 2px solid ${ThemingVariables.colors.gray[5]};
                background-color: ${ThemingVariables.colors.gray[5]};
                z-index: ${index};
              `}
            >
              <img
                src={user.avatar}
                className={css`
                  height: 32px;
                  width: 32px;
                  border-radius: 100%;
                  opacity: ${isActive ? 1 : 0.3};
                `}
              />
            </div>
          )
        })}
    </div>
  )
}
