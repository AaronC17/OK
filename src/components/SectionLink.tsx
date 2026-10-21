import { useEffect, type AnchorHTMLAttributes, type MouseEvent } from 'react'

export function navigateToSection(id: string, behavior: ScrollBehavior = 'auto') {
  const section = document.getElementById(id)
  if (!section) return
  const url = new URL(window.location.href)
  if (url.hash !== `#${id}`) {
    url.hash = id
    window.history.pushState(window.history.state, '', url)
  }
  // CSS defines smooth scrolling and the reduced-motion override.
  if (!section.hasAttribute('tabindex')) section.tabIndex = -1
  section.focus({ preventScroll: true })
  section.scrollIntoView({ block: 'start', behavior })
}

/** The initial HTML has no sections yet. Restore deep links after React and
 * fonts are ready, including when the destination is in a deferred section. */
export function useSectionNavigation() {
  useEffect(() => {
    let disposed = false
    const restore = () => {
      if (disposed || !window.location.hash) return
      try { navigateToSection(decodeURIComponent(window.location.hash.slice(1)), 'instant') }
      catch { /* Malformed external fragments should not break the storefront. */ }
    }
    if (window.location.hash) void document.fonts.ready.then(() => { if (!disposed) restore() })
    window.addEventListener('hashchange', restore)
    return () => { disposed = true; window.removeEventListener('hashchange', restore) }
  }, [])
}

/** Keep section navigation inside the current document, including LAN preview
 * query parameters. Modified clicks retain the anchor's normal browser behavior. */
function navigate(event: MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const link = event.currentTarget
  if (link.target && link.target !== '_self') return
  const id = decodeURIComponent(link.hash.slice(1))
  if (!document.getElementById(id)) return
  event.preventDefault()
  navigateToSection(id)
}

export function SectionLink({ section, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & { section: string }) {
  return <a {...props} href={`#${section}`} onClick={navigate} />
}
