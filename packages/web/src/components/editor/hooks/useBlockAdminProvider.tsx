import { isArray } from 'lodash'
import React, { useCallback, useMemo, useRef, useContext } from 'react'

import type { BlockInstanceInterface } from '../types'

export const useBlockAdminProvider = () => {
  const blockInstanceRefs = useRef<
    Record<
      string,
      BlockInstanceInterface | ((value: BlockInstanceInterface | PromiseLike<BlockInstanceInterface>) => void)[]
    >
  >({})

  const registerBlockInstance = useCallback((blockId: string, blockInstance?: BlockInstanceInterface) => {
    const currentValueOrResolves = blockInstanceRefs.current[blockId]
    if (!blockInstance) {
      delete blockInstanceRefs.current[blockId]
      return
    }

    if (currentValueOrResolves && isArray(currentValueOrResolves)) {
      currentValueOrResolves.forEach((resolve) => resolve(blockInstance))
    }
    blockInstanceRefs.current[blockId] = blockInstance
  }, [])

  const getBlockInstanceById = useCallback((blockId: string) => {
    return new Promise<BlockInstanceInterface>((resolve, reject) => {
      const currentValueOrResolves = blockInstanceRefs.current[blockId]
      if (!currentValueOrResolves) {
        blockInstanceRefs.current[blockId] = [resolve]
      } else {
        if (isArray(currentValueOrResolves)) {
          ;(blockInstanceRefs.current[blockId] as Function[]).push(resolve)
        } else {
          resolve(blockInstanceRefs.current[blockId] as BlockInstanceInterface)
        }
      }
    })
  }, [])

  return useMemo(() => ({ getBlockInstanceById, registerBlockInstance }), [getBlockInstanceById, registerBlockInstance])
}

export const BlockAdminContext = React.createContext<ReturnType<typeof useBlockAdminProvider> | null>(null)

export const useBlockAdmin = () => {
  return useContext(BlockAdminContext)
}
