import { useLoggedUser } from '@app/hooks/useAuth'
import { useWorkspace } from '@app/context/workspace'
import { fetchBlock } from '@app/api'
import debug from 'debug'
import { nanoid } from 'nanoid'
import { ReactNode, useEffect, useState } from 'react'
import { useQueryClient } from 'react-query'
import io, { Socket } from 'socket.io-client'
import type { DefaultEventsMap } from 'socket.io-client/build/typed-events'
import { WS_URI } from '@app/utils'
import { SocketContext } from '../context/socketio'

const logger = debug('tellery:socket')

export const SocketContextProvider = (props: { children: ReactNode }) => {
  const [socketInstance, setSocketInstance] = useState<Socket<DefaultEventsMap, DefaultEventsMap> | null>(null)
  const queryClient = useQueryClient()
  const user = useLoggedUser()

  const workspace = useWorkspace()
  useEffect(() => {
    const socket = io(WS_URI, {
      reconnectionAttempts: 10,
      transports: ['websocket'],
      query: {
        workspaceId: workspace.id,
        sessionId: nanoid(),
        userId: user.id
      }
    })

    socket.on('connect_error', (error) => {
      logger(error)
    })

    setSocketInstance(socket)
    return () => {
      logger('close')
      socket.close()
    }
  }, [user.id, setSocketInstance, workspace.id])

  useEffect(() => {
    logger('socketInstance', socketInstance, socketInstance?.disconnected)

    if (!socketInstance) return
    const onNoti = (data: {
      type: string
      value: { workspaceId: string; operatorId: string; id: string; type: 'block' }[]
    }) => {
      logger('socketInstance', socketInstance, data)
      if (data.type === 'updateEntity') {
        for (const entity of data.value) {
          if (entity.type === 'block') {
            fetchBlock(entity.id, workspace.id)
          }
        }
      }
    }
    socketInstance.on('notification', onNoti)
    return () => {
      logger('socketInstance,off no')
      socketInstance.off('notification', onNoti)
    }
  }, [queryClient, socketInstance, workspace.id])

  return <SocketContext.Provider value={socketInstance}>{props.children}</SocketContext.Provider>
}
