import type { AxiosError } from 'axios'
import { debounce } from 'lodash'
import { MutableRefObject, RefObject, useCallback, useEffect, useRef, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { useHover, ReactDOMAttributes } from '@use-gesture/react'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect'
export { useMediaQueries, useMediaQuery } from '@react-hook/media-query'

export const useMounted = (): RefObject<boolean> => {
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  return mounted
}

export function useSearchParams() {
  return new URLSearchParams(useLocation().search)
}

export function useDebounce(cb: Function, delay: number, leading?: boolean) {
  // ...
  const mounted = useMounted()
  const inputsRef = useRef<{ cb: Function; delay: number }>({ cb, delay }) // mutable ref like with useThrottle
  useEffect(() => {
    inputsRef.current = { cb, delay }
  }) // also track cur. delay

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    debounce(
      (...args) => {
        // Debounce is an async callback. Cancel it, if in the meanwhile
        // (1) component has been unmounted (see isMounted in snippet)
        // (2) delay has changed
        if (inputsRef.current.delay === delay && mounted.current) inputsRef.current.cb(...args)
      },
      delay,
      { leading: leading }
    ),
    [delay, leading]
  )
}

interface OpenStoryOpetions {
  blockId?: string
  _currentStoryId?: string
}

export const useOpenStory = () => {
  const history = useHistory()
  const [openInNewTab, setOpenInNewTab] = useState(false)
  useEffect(() => {
    function down(e: KeyboardEvent) {
      setOpenInNewTab(e.ctrlKey || e.metaKey)
    }
    function up() {
      setOpenInNewTab(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      setOpenInNewTab(false)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const handler = useCallback(
    (storyId: string, options?: OpenStoryOpetions) => {
      const { blockId } = options ?? {}
      const targetUrl = `/story/${storyId}${blockId ? `#${blockId}` : ''}`

      if (openInNewTab) {
        window.open(targetUrl)
      } else {
        history.push(targetUrl)
      }
    },
    [history, openInNewTab]
  )
  return handler
}

export function useAsync<T, A extends Array<unknown>>(asyncFunction: (...args: A) => Promise<T> | undefined) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [value, setValue] = useState<T>()
  const [error, setError] = useState<AxiosError>()
  useEffect(() => {
    setStatus('idle')
  }, [asyncFunction])
  const execute = useCallback(
    async (...args: A) => {
      setStatus('pending')
      setValue(undefined)
      setError(undefined)
      try {
        const response = await asyncFunction(...args)
        setValue(response)
        setStatus('success')
      } catch (err) {
        setError(err as AxiosError)
        setStatus('error')
      }
    },
    [asyncFunction]
  )
  return { execute, status, value, error }
}

export function usePrevious<T>(value: T): T | null {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = useRef<T | null>(null)

  // Store current value in ref
  useEffect(() => {
    if (value) {
      ref.current = value
    }
  }, [value]) // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current
}

// Hook
export function useLockBodyScroll() {
  useIsomorphicLayoutEffect(() => {
    // Get original body overflow
    const originalStyle = window.getComputedStyle(document.body).overflow
    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden'
    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, []) // Empty array ensures effect is only run on mount and unmount
}

// Hook
export function useOnClickOutside<T extends HTMLElement | null>(
  ref: MutableRefObject<T>,
  handler: (event: Event) => void
) {
  useEffect(
    () => {
      const listener = (event: Event) => {
        // Do nothing if clicking ref's element or descendent elements
        if (!ref.current || ref.current.contains(event.target as Node)) {
          return
        }

        handler(event)
      }

      document.addEventListener('mousedown', listener)
      document.addEventListener('touchstart', listener)

      return () => {
        document.removeEventListener('mousedown', listener)
        document.removeEventListener('touchstart', listener)
      }
    },
    // Add ref and handler to effect dependencies
    // It's worth noting that because passed in handler is a new ...
    // ... function on every render that will cause this effect ...
    // ... callback/cleanup to run every render. It's not a big deal ...
    // ... but to optimize you can wrap handler in useCallback before ...
    // ... passing it into this hook.
    [ref, handler]
  )
}

// Hook
// export function useHover<T>(): [MutableRefObject<T | null>, boolean] {
//   const [value, setValue] = useState(false)

//   const ref = useRef<T | null>(null)

//   const handleMouseOver = () => setValue(true)
//   const handleMouseOut = () => setValue(false)

//   useEffect(
//     () => {
//       const node = ref.current as unknown as HTMLElement
//       if (node) {
//         node.addEventListener('mouseover', handleMouseOver)
//         node.addEventListener('mouseleave', handleMouseOut)

//         return () => {
//           node.removeEventListener('mouseover', handleMouseOver)
//           node.removeEventListener('mouseleave', handleMouseOut)
//         }
//       }
//     },
//     [ref] // Recall only if ref changes
//   )

//   return [ref, value]
// }

export const useBindHovering = () => {
  const [hovering, setHovering] = useState<boolean>()
  const bind = useHover(
    (event) => {
      setHovering(event.hovering)
    },
    { eventOptions: { passive: true } }
  )
  return [bind, hovering] as [(...args: any[]) => ReactDOMAttributes, boolean]
}

export const useViewHeightVarible = () => {
  useEffect(() => {
    const resizeListener = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }
    resizeListener()
    window.addEventListener('resize', resizeListener)
    return () => {
      window.removeEventListener('resize', resizeListener)
    }
  }, [])
}

// Hook
export function useOnScreen(ref: RefObject<Element>, rootMargin = '0px') {
  // State and setter for storing whether element is visible
  const [isIntersecting, setIntersecting] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Update our state when observer callback fires
        setIntersecting(entry.isIntersecting)
      },
      {
        rootMargin
      }
    )
    const element = ref.current
    if (element) {
      observer.observe(element)
    }
    return () => {
      element && observer.unobserve(element)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty array ensures that effect is only run on mount and unmount
  return isIntersecting
}
