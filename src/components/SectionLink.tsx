import type { AnchorHTMLAttributes, MouseEvent } from 'react'

export function navigateToSection(id: string) {
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
  section.scrollIntoView({ block: 'start', behavior: 'auto' })
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
