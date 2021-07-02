import { useLoggedUser } from '@app/hooks/useAuth'
import { css } from '@emotion/css'
import { SocketContext } from 'context/socketio'
import { motion } from 'framer-motion'
import { useMgetUsers, User } from 'hooks/api'
import React, { useContext, useEffect, useMemo, useState } from 'react'

export const OperatorsContext = React.createContext<Record<string, User[]> | null>(null)

export const useBlockOperators = (blockId: string) => {
  const blockOperators = useContext(OperatorsContext)
  return blockOperators?.[blockId] ?? []
}

export const OperatorsAvatar: React.FC<{ blockId: string }> = ({ blockId }) => {
  const operators = useBlockOperators(blockId)
  return (
    <div
      className={css`
        position: absolute;
        left: 0;
        transform: translateX(-120px);
        width: 60px;
        top: 0;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        transition: opacity 0.35s;
      `}
    >
      {operators.slice(0, 3).map((operator) => {
        if (!operator) return null
        return <Operator key={operator.id} operator={operator} />
      })}
    </div>
  )
}

export const useStoryOperators = (storyId: string) => {
  const socket = useContext(SocketContext)
  const user = useLoggedUser()

  const [operatorPositions, setOperatorPositions] = useState<Record<string, string>>({})
  const operatorIds = useMemo(() => {
    return Object.keys(operatorPositions)
  }, [operatorPositions])

  const { data: operatorsMap } = useMgetUsers(operatorIds)

  const blocksOperators = useMemo(() => {
    const map: Record<string, User[]> = {}
    if (!operatorsMap) return {}
    for (const operatorId in operatorPositions) {
      const blockId = operatorPositions[operatorId]
      const operator = operatorsMap[operatorId]
      map[blockId] = [...(map[blockId] ?? []), operator]
    }
    return map
  }, [operatorPositions, operatorsMap])

  useEffect(() => {
    if (!socket) return
    const onNoti = (data: {
      type: string
      value: {
        event: string
        args: {
          operatorId: string
          storyId: string
          blockId: string
          userIds: string[]
        }
      }
    }) => {
      // console.info('websocket::message::broadcast', data)
      if (data.type === 'broadcast') {
        if (data.value.event === 'moveMouseInStory') {
          if (data.value.args.storyId === storyId) {
            const { operatorId, blockId } = data.value.args
            if (operatorId && blockId && operatorId !== user.id) {
              setOperatorPositions((positions) => {
                return { ...positions, [operatorId]: blockId }
              })
            }
          }
        }
        if (data.value.event === 'activeUsersInStory') {
          if (data.value.args.storyId === storyId) {
            const { userIds } = data.value.args
            setOperatorPositions((positions) => {
              const newPositions: Record<string, string> = {}
              for (const userId of userIds) {
                if (positions[userId]) {
                  newPositions[userId] = positions[userId]
                }
              }
              return newPositions
            })
          }
        }
        if (data.value.event === 'userDisconnected') {
          const { operatorId } = data.value.args
          setOperatorPositions((positions) => {
            const newPositions = { ...positions }
            newPositions[operatorId] && delete newPositions[operatorId]
            return newPositions
          })
        }
      }
    }
    socket.on('notification', onNoti)
    const onEnterStory = () => {
      socket.emit('event', {
        type: 'userEnterStory',
        value: {
          storyId: storyId
        }
      })
    }
    const onLeaveStory = () => {
      socket.emit('event', {
        type: 'userLeaveStory',
        value: {
          storyId: storyId
        }
      })
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onEnterStory()
      } else {
        onLeaveStory()
      }
    }
    onEnterStory()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      socket.off('notification', onNoti)
      document.removeEventListener('visibilitychange', onVisibilityChange)

      onLeaveStory()
    }
  }, [socket, storyId, user.id])
  return blocksOperators
}

const spring = {
  type: 'spring',
  stiffness: 500,
  damping: 30
}

export const Operator = (props: { operator: User }) => {
  return (
    <motion.div
      layoutId={props?.operator.id}
      className={css`
        flex-shrink: 0;
        height: 30px;
        width: 30px;
        border-radius: 100%;
        overflow: hidden;
      `}
      transition={spring}
    >
      <img
        className={css`
          height: 100%;
          width: 100%;
        `}
        src={props?.operator.avatar}
      ></img>
    </motion.div>
  )
}
