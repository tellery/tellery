import { useMgetUsers, User, useStoryVisits } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useSocketInstance } from '@app/hooks/useSocketContextProvider'
import { useTippySingleton } from '@app/hooks/useTippySingleton'
import { ThemingVariables } from '@app/styles'
import { css } from '@emotion/css'
import styled from '@emotion/styled'
import Tippy from '@tippyjs/react'
import dayjs from 'dayjs'
import React, { useEffect, useMemo, useState } from 'react'
import Avatar from './Avatar'
import { TippySingletonContextProvider } from './TippySingletonContextProvider'

interface Visit {
  storyId: string
  userId: string
  lastVisitTimestamp: number
}

export function StoryVisits(props: { storyId: string; className?: string }) {
  const { storyId } = props
  const { data: visits, refetch } = useStoryVisits(props.storyId)
  const socket = useSocketInstance()
  const [activeIds, setActiveIds] = useState<string[]>([])
  const user = useLoggedUser()
  const visitsIds = useMemo(() => {
    return [user.id, ...(visits ?? [])?.map((visit) => visit.userId)]
  }, [visits, user.id])
  const { data: usersMap } = useMgetUsers(visitsIds)

  const sortedVisits = useMemo(() => {
    if (!visits) return undefined
    const userIndex = visits.findIndex((visit) => visit.userId === user.id)
    const currentUser =
      userIndex !== -1
        ? visits[userIndex]
        : {
            storyId: storyId,
            userId: user.id,
            lastVisitTimestamp: new Date().getTime()
          }
    const restVisits = userIndex === -1 ? visits : [...visits.slice(0, userIndex), ...visits.slice(userIndex + 1)]

    return [
      currentUser,
      ...restVisits.sort((a, b) => {
        const valueOfA = activeIds.includes(a.userId)
        const valueOfB = activeIds.includes(b.userId)
        if (valueOfA && valueOfB) {
          return 0
        } else if (valueOfA) {
          return -1
        } else {
          return 1
        }
      })
    ]
  }, [activeIds, storyId, user.id, visits])

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
    <Container className={props.className}>
      <TippySingletonContextProvider arrow={false} delay={0}>
        {sortedVisits &&
          sortedVisits.length > 1 &&
          sortedVisits.map((_visit, index) => {
            const visit = sortedVisits[sortedVisits.length - index - 1]
            const user = usersMap?.[visit.userId]
            if (!user) return null
            const isActive = activeIds.findIndex((id) => id === user.id) !== -1
            return <StoryVisitAvatar user={user} isActive={isActive} index={index} visit={visit} key={user.id} />
          })}
      </TippySingletonContextProvider>
    </Container>
  )
}

const StoryVisitAvatar: ReactFCWithChildren<{ isActive: boolean; user: User; index: number; visit: Visit }> = ({
  isActive,
  user,
  index,
  visit
}) => {
  const tippyInstance = useTippySingleton()
  return (
    <Tippy
      singleton={tippyInstance}
      content={
        <div>
          {user.name}
          <br />
          {isActive ? null : `Last Viewed ${dayjs(visit.lastVisitTimestamp).fromNow()}`}
        </div>
      }
      key={visit.userId}
    >
      <AvatarWrapper index={index} key={visit.userId}>
        <Avatar
          src={user.avatar}
          email={user.email}
          size={32}
          className={css`
            opacity: ${isActive ? 1 : 0.3};
          `}
        />
      </AvatarWrapper>
    </Tippy>
  )
}

const Container = styled.div`
  display: inline-flex;
  flex-direction: row-reverse;
`

const AvatarWrapper = styled.div<{ index: number }>`
  height: 36px;
  width: 36px;
  margin-left: -12px;
  border-radius: 100%;
  overflow: hidden;
  border: 2px solid ${ThemingVariables.colors.gray[5]};
  background-color: ${ThemingVariables.colors.gray[5]};
  z-index: ${(props) => props.index};
`
