// Injected only by the isolated LAN audit server, never by the deployed app.
// Collects local timings/capabilities, not clicks, form contents or personal data.
(() => {
  const session = Math.random().toString(36).slice(2)
  const supported = typeof PerformanceObserver === 'function' ? PerformanceObserver.supportedEntryTypes || [] : []
  const tasks = [], errors = []
  let lcp = null, cls = null, visible = false, recorded = false, sampling = false, generation = 0
  const device = () => ({ userAgent: navigator.userAgent, width: innerWidth, height: innerHeight, dpr: devicePixelRatio, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, secureContext: isSecureContext, worker: typeof Worker === 'function', supportedEntryTypes: supported })
  const observe = (type, callback) => {
    if (!supported.includes(type)) return
    try { new PerformanceObserver(list => list.getEntries().forEach(callback)).observe({ type, buffered: true }) } catch {}
  }
  observe('longtask', entry => tasks.push({ start: entry.startTime, duration: entry.duration }))
  observe('largest-contentful-paint', entry => { lcp = entry.startTime })
  observe('layout-shift', entry => { if (!entry.hadRecentInput) cls = (cls || 0) + entry.value })
  addEventListener('error', event => {
    const resource = event.target?.src || event.target?.href
    errors.push(String(event.message || (resource ? `Resource error: ${new URL(resource, location.href).pathname}` : 'Resource error')).slice(0, 300))
  }, true)
  addEventListener('unhandledrejection', event => { errors.push(String(event.reason?.message || event.reason).slice(0, 300)) })
  const send = (event, extra = {}) => fetch('/__phone-report', {
    method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session, event, time: performance.now(), device: device(), lcp, cls, errors: errors.slice(-10), preparation: performance.getEntriesByType('measure').filter(entry => entry.name.startsWith('mix:')).map(entry => ({ name: entry.name, duration: entry.duration, start: entry.startTime })), ...extra }),
  }).catch(() => {})
  const cadence = samples => {
    const sorted = [...samples].sort((a, b) => a - b)
    return { samples: sorted.length, p50: sorted[Math.floor(sorted.length * .5)] || null, p95: sorted[Math.floor(sorted.length * .95)] || null, max: sorted.length ? sorted[sorted.length - 1] : null, over50: sorted.filter(gap => gap > 50).length }
  }
  addEventListener('load', () => setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    send('load', { navigation: nav ? { type: nav.type, domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd } : null, section: location.hash, longTasks: supported.includes('longtask') ? tasks : null })
  }, 3000), { once: true })

  const prepare = () => {
    const film = document.querySelector('.mix-film')
    if (!film) return false
    send('app-ready')
    const sample = () => {
      if (recorded || sampling || !visible || document.hidden) return
      if (film.dataset.static === 'true') { send('reduced-motion'); recorded = true; return }
      const animations = film.getAnimations?.({ subtree: true }) || []
      if (!animations.some(animation => animation.playState === 'running')) { setTimeout(sample, 150); return }
      sampling = true
      const ticket = ++generation
      const start = performance.now(), gaps = [], falling = [], firstTask = tasks.length
      const initialTime = Number(animations[0]?.currentTime || 0)
      let previous = null, scrollEvents = 0
      const onScroll = () => { scrollEvents++ }
      addEventListener('scroll', onScroll, { passive: true })
      send('animation-start', { animationCount: animations.length, renderer: film.dataset.renderer || 'svg' })
      const frame = now => {
        if (ticket !== generation || !visible || document.hidden || (previous !== null && now - previous > 1000)) {
          sampling = false
          removeEventListener('scroll', onScroll)
          send('animation-interrupted', { elapsed: now - start, reason: ticket !== generation || document.hidden ? 'hidden-tab' : !visible ? 'offscreen' : 'long-stall', raf: cadence(gaps), falling: cadence(falling) })
          if (visible && !document.hidden) setTimeout(sample, 150)
          return
        }
        if (previous !== null) {
          gaps.push(now - previous)
          const phase = (initialTime + now - start) % 15000
          if (phase >= 3200 && phase <= 4500) falling.push(now - previous)
        }
        previous = now
        if (now - start < 15_000) { requestAnimationFrame(frame); return }
        sampling = false; recorded = true
        removeEventListener('scroll', onScroll)
        send('animation-complete', {
          elapsed: now - start, scrollEvents,
          raf: cadence(gaps), falling: cadence(falling),
          longTasks: supported.includes('longtask') ? tasks.slice(firstTask) : null,
        })
      }
      requestAnimationFrame(frame)
    }
    new IntersectionObserver(([entry]) => { visible = entry.isIntersecting && entry.intersectionRatio >= .6; if (visible) sample() }, { threshold: [0, .6, 1] }).observe(film)
    document.addEventListener('visibilitychange', () => { if (document.hidden) generation++; else sample() })
    return true
  }
  addEventListener('DOMContentLoaded', () => {
    if (prepare()) return
    const observer = new MutationObserver(() => { if (prepare()) observer.disconnect() })
    observer.observe(document.getElementById('root'), { childList: true, subtree: true })
    setTimeout(() => { observer.disconnect(); if (!document.querySelector('.mix-film')) send('animation-missing') }, 15_000)
  }, { once: true })
})()
