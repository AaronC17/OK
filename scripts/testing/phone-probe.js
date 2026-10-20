// Injected only by the isolated LAN audit server, never by the deployed app.
// Collects local timings/capabilities, not form contents or personal data.
(() => {
  const session = Math.random().toString(36).slice(2)
  const supported = typeof PerformanceObserver === 'function' ? PerformanceObserver.supportedEntryTypes || [] : []
  const tasks = [], errors = [], scenes = new Map()
  let lcp = null, cls = null
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
    return { samples: sorted.length, p50: sorted[Math.floor(sorted.length * .5)] || null, p95: sorted[Math.floor(sorted.length * .95)] || null, max: sorted.at(-1) || null, over50: sorted.filter(gap => gap > 50).length }
  }
  addEventListener('load', () => setTimeout(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    send('load', { navigation: nav ? { type: nav.type, domContentLoaded: nav.domContentLoadedEventEnd, load: nav.loadEventEnd } : null, longTasks: supported.includes('longtask') ? tasks : null })
  }, 3000), { once: true })

  function watch(element, name) {
    if (scenes.has(name)) return
    const state = { visible: false, recorded: false, sampling: false, generation: 0, retry: 0 }
    scenes.set(name, state)
    const video = element.querySelector('video')
    const available = () => state.visible && !document.hidden && (name === 'recipe' ? !document.querySelector('dialog[open]') : element.closest('dialog')?.open)
    const sample = () => {
      clearTimeout(state.retry)
      if (state.recorded || state.sampling || !available()) return
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { send('reduced-motion', { scene: name }); state.recorded = true; return }
      const animations = element.getAnimations({ subtree: true })
      if (video ? video.paused || video.readyState < 3 : !animations.some(animation => animation.playState === 'running')) {
        state.retry = setTimeout(sample, 200)
        return
      }
      state.sampling = true
      const generation = state.generation, start = performance.now(), gaps = [], falling = [], presented = [], firstTask = tasks.length
      const qualityBefore = video?.getVideoPlaybackQuality?.()
      const initialTime = video ? video.currentTime * 1000 : Number(animations[0]?.currentTime || 0)
      let previous = null, previousVideo = null, callback = 0, stalls = 0, scrollEvents = 0
      const onScroll = () => { scrollEvents++ }, onWaiting = () => { stalls++ }
      addEventListener('scroll', onScroll, { passive: true })
      video?.addEventListener('waiting', onWaiting)
      const videoFrame = (now, metadata) => {
        if (previousVideo !== null) presented.push(metadata.expectedDisplayTime - previousVideo)
        previousVideo = metadata.expectedDisplayTime
        callback = video.requestVideoFrameCallback(videoFrame)
      }
      if (video?.requestVideoFrameCallback) callback = video.requestVideoFrameCallback(videoFrame)
      const cleanup = () => {
        state.sampling = false
        removeEventListener('scroll', onScroll)
        video?.removeEventListener('waiting', onWaiting)
        if (callback) video.cancelVideoFrameCallback(callback)
      }
      send('animation-start', { scene: name, animationCount: animations.length, renderer: name === 'truck' ? 'layers' : element.dataset.renderer || 'svg' })
      const frame = now => {
        if (generation !== state.generation || !available() || (previous !== null && now - previous > 1000)) {
          cleanup()
          send('animation-interrupted', { scene: name, elapsed: now - start, reason: document.hidden ? 'hidden-tab' : !available() ? 'offscreen-or-covered' : 'long-stall', raf: cadence(gaps) })
          if (available()) state.retry = setTimeout(sample, 200)
          return
        }
        if (previous !== null) {
          gaps.push(now - previous)
          const phase = video ? video.currentTime * 1000 : (initialTime + now - start) % 15000
          if (phase >= 3200 && phase <= 4500) falling.push(now - previous)
        }
        previous = now
        if (now - start < 15000) { requestAnimationFrame(frame); return }
        cleanup(); state.recorded = true
        const quality = video?.getVideoPlaybackQuality?.()
        send('animation-complete', {
          scene: name, elapsed: now - start, scrollEvents, raf: cadence(gaps), falling: name === 'recipe' ? cadence(falling) : undefined,
          video: video ? { source: new URL(video.currentSrc, location.href).pathname, width: video.videoWidth, height: video.videoHeight, waitingEvents: stalls,
            decoded: quality ? quality.totalVideoFrames - qualityBefore.totalVideoFrames : null, dropped: quality ? quality.droppedVideoFrames - qualityBefore.droppedVideoFrames : null,
            presentedCallbacks: video.requestVideoFrameCallback ? cadence(presented) : null } : null,
          longTasks: supported.includes('longtask') ? tasks.slice(firstTask) : null,
        })
      }
      requestAnimationFrame(frame)
    }
    new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting && entry.intersectionRatio >= .6
      if (!state.visible) state.generation++
      else sample()
    }, { threshold: [0, .6, 1] }).observe(element)
    document.addEventListener('visibilitychange', () => { if (document.hidden) state.generation++; else sample() })
    document.addEventListener('close', () => { state.retry = setTimeout(sample, 300) }, true)
  }
  addEventListener('DOMContentLoaded', () => {
    const discover = () => {
      const film = document.querySelector('.mix-film'), truck = document.querySelector('.sinpe-transit-card')
      if (film) watch(film, 'recipe')
      if (truck) watch(truck, 'truck')
    }
    const observer = new MutationObserver(discover)
    observer.observe(document.getElementById('root'), { childList: true, subtree: true })
    discover()
    send('app-ready')
  }, { once: true })
})()
