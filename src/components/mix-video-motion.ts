import type { MixSceneMotion } from './mix-motion.ts'

/** The decoder owns the clock. HTML labels use compositor animations and only
 * resync on media events, including buffering, seeking and the loop boundary. */
export function animateMixVideo(video: HTMLVideoElement, container: HTMLElement, onBlocked: (blocked: boolean) => void): MixSceneMotion {
  const animations = container.getAnimations({ subtree: true })
  let running = false
  let disposed = false
  let buffering = true
  const sync = () => {
    const time = video.currentTime * 1000
    const playing = running && !buffering && !video.paused && !video.seeking && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    animations.forEach(animation => {
      if (Math.abs(Number(animation.currentTime) - time) > 80 || animation.playState !== (playing ? 'running' : 'paused')) animation.currentTime = time
      if (playing) animation.play()
      else animation.pause()
    })
  }
  const playing = () => {
    if (!running || disposed) { video.pause(); return }
    buffering = false
    onBlocked(false)
    sync()
  }
  const ready = () => { container.dataset.sceneReady = 'true' }
  const waiting = () => { buffering = true; sync() }
  const events = ['timeupdate', 'pause', 'seeking', 'seeked', 'ended'] as const
  events.forEach(event => video.addEventListener(event, sync))
  video.addEventListener('playing', playing)
  video.addEventListener('loadeddata', ready)
  video.addEventListener('waiting', waiting)
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) ready()
  sync()
  return {
    animations,
    setRunning(value) {
      running = value
      if (!value) { video.pause(); sync(); return }
      // muted + playsInline permits native inline autoplay on iOS/Android.
      // Low-power mode may still require a tap; keep that recovery explicit.
      void video.play().catch(error => {
        if (!disposed && running && error.name !== 'AbortError') onBlocked(true)
      })
    },
    dispose() {
      disposed = true
      running = false
      video.pause()
      events.forEach(event => video.removeEventListener(event, sync))
      video.removeEventListener('playing', playing)
      video.removeEventListener('loadeddata', ready)
      video.removeEventListener('waiting', waiting)
      animations.forEach(animation => animation.cancel())
    },
  }
}
