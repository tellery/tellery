import { useLoggedUser } from '@app/hooks/useAuth'
import { SocketContext } from 'context/socketio'
import { throttle } from 'lodash'
import { useCallback, useContext, useEffect, useRef } from 'react'

export const useMouseMoveInEmitter = (storyId: string, mouseInBlockId: string | null) => {
  const socket = useContext(SocketContext)
  const currentBlockIdRef = useRef<string | null>(null)
  const user = useLoggedUser()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const emitMouseHoverOnBlocks = useCallback(
    throttle((blockId) => {
      if (!socket) return
      socket.emit('broadcast', {
        event: 'moveMouseInStory',
        args: {
          operatorId: user.id,
          storyId: storyId,
          blockId: blockId
        }
      })
    }, 100),
    [socket, storyId, user.id]
  )

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
        }
      }
    }) => {
      // console.info('websocket::message::broadcast', data)
      if (data.type === 'broadcast') {
        if (data.value.event === 'activeUsersInStory') {
          if (data.value.args.storyId === storyId) {
            currentBlockIdRef.current && emitMouseHoverOnBlocks(currentBlockIdRef.current)
          }
        }
      }
    }
    socket.on('notification', onNoti)
    return () => {
      socket.off('notification', onNoti)
    }
  }, [emitMouseHoverOnBlocks, socket, storyId, user.id])

  useEffect(() => {
    mouseInBlockId && emitMouseHoverOnBlocks(mouseInBlockId)
    currentBlockIdRef.current = mouseInBlockId
  }, [emitMouseHoverOnBlocks, mouseInBlockId])
}
