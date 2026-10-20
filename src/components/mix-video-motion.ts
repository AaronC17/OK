import type { MixSceneMotion } from './mix-motion.ts'

/** The decoder owns the clock. HTML labels use compositor animations and only
 * resync on media events, including buffering, seeking and the loop boundary. */
export function animateMixVideo(video: HTMLVideoElement, container: HTMLElement, onBlocked: (blocked: boolean) => void): MixSceneMotion {
  const animations = container.getAnimations({ subtree: true })
  let running = false
  let disposed = false
  let previousTime = 0
  const play = () => {
    void video.play().catch(error => {
      if (!disposed && running && error.name !== 'AbortError') onBlocked(true)
    })
  }
  const sync = () => {
    const time = video.currentTime * 1000
    // Some WebKit decoders wrap to zero but leave a looping movie paused.
    // Recover only that boundary, never an offscreen/overlay/manual pause.
    const wrapped = time < 100 && previousTime > video.duration * 1000 - 1000
    previousTime = time
    if (wrapped && running && !disposed && video.loop && video.paused && !video.seeking) play()
    // Native readiness also recovers seeks/loop wraps that emit canplay without
    // a new playing event. A separate buffering flag could remain stuck.
    const playing = running && !video.paused && !video.seeking && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA
    animations.forEach(animation => {
      const stateChanged = animation.playState !== (playing ? 'running' : 'paused')
      if (Math.abs(Number(animation.currentTime) - time) > 80 || stateChanged) animation.currentTime = time
      // play()/pause() also enqueue animation updates. A media timeupdate is
      // normally just a drift check, not a reason to resubmit every effect.
      if (stateChanged) {
        if (playing) animation.play()
        else animation.pause()
      }
    })
  }
  const playing = () => {
    if (!running || disposed) { video.pause(); return }
    onBlocked(false)
    sync()
  }
  const ready = () => { container.dataset.sceneReady = 'true' }
  const events = ['timeupdate', 'pause', 'waiting', 'canplay', 'seeking', 'seeked', 'ended'] as const
  events.forEach(event => video.addEventListener(event, sync))
  video.addEventListener('playing', playing)
  video.addEventListener('loadeddata', ready)
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) ready()
  sync()
  return {
    animations,
    setRunning(value) {
      running = value
      if (!value) { video.pause(); sync(); return }
      // muted + playsInline permits native inline autoplay on iOS/Android.
      // Low-power mode may still require a tap; keep that recovery explicit.
      play()
    },
    dispose() {
      disposed = true
      running = false
      video.pause()
      events.forEach(event => video.removeEventListener(event, sync))
      video.removeEventListener('playing', playing)
      video.removeEventListener('loadeddata', ready)
      animations.forEach(animation => animation.cancel())
    },
  }
}
