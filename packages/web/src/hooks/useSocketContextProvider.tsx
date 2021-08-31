import { fetchBlock } from '@app/api'
import { useRefetchMetrics, useUpdateBlocks } from '@app/hooks/api'
import { useLoggedUser } from '@app/hooks/useAuth'
import { useWorkspace } from '@app/hooks/useWorkspace'
import { Editor } from '@app/types'
import { blockIdGenerator, WS_URI } from '@app/utils'
import debug from 'debug'
import { createContext, useContext, useEffect, useState } from 'react'
import { useQueryClient } from 'react-query'
import io, { Socket } from 'socket.io-client'
import type { DefaultEventsMap } from 'socket.io-client/build/typed-events'

export const logger = debug('tellery:socket')

export const useSocketContextProvider = () => {
  const [socketInstance, setSocketInstance] = useState<Socket<DefaultEventsMap, DefaultEventsMap> | null>(null)
  const queryClient = useQueryClient()
  const user = useLoggedUser()
  const workspace = useWorkspace()
  const updateBlocks = useUpdateBlocks()
  const refetchMetrics = useRefetchMetrics()

  useEffect(() => {
    const socket = io(WS_URI, {
      reconnectionAttempts: 10,
      transports: ['websocket'],
      query: {
        workspaceId: workspace.id,
        sessionId: blockIdGenerator(),
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
            fetchBlock(entity.id, workspace.id).then((res) => {
              updateBlocks({ [res.id]: res })
              if (res.type === Editor.BlockType.QueryBuilder) {
                refetchMetrics()
              }
            })
          }
        }
      }
    }
    socketInstance.on('notification', onNoti)
    return () => {
      logger('socketInstance, off')
      socketInstance.off('notification', onNoti)
    }
  }, [queryClient, refetchMetrics, socketInstance, updateBlocks, workspace.id])

  return socketInstance
}

export const SocketContext = createContext<ReturnType<typeof useSocketContextProvider> | null>(null)

export const useSocketInstance = () => {
  return useContext(SocketContext)
}
