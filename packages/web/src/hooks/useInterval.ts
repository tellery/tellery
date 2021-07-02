import { useEffect, useRef } from 'react'

export function useInterval(callback: Function, delay: number | null) {
  const savedCallback = useRef<Function>()

  useEffect(() => {
    savedCallback.current = callback
  })

  useEffect(() => {
    function tick() {
      savedCallback.current?.()
    }

    if (delay !== null) {
      const id = setInterval(tick, delay)
      return () => clearInterval(id)
    }
  }, [delay])
}
