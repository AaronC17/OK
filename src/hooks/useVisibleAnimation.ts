import { useEffect, useRef } from 'react'

/** Pause decorative CSS loops without resetting their playhead or rerendering. */
export function useVisibleAnimation<T extends HTMLElement>() {
  const root = useRef<T>(null)
  useEffect(() => {
    const element = root.current
    if (!element) return
    let visible = false
    const update = () => { element.dataset.motionPaused = String(!visible || document.hidden) }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      update()
    }, { rootMargin: '40px 0px' })
    observer.observe(element)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      delete element.dataset.motionPaused
    }
  }, [])
  return root
}
