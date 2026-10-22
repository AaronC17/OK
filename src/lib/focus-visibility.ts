// WebKit can mark programmatic focus after a tap as :focus-visible, including
// section navigation and dialog focus restoration. Keep rings for keyboard use.
const pointerInput = () => { document.documentElement.dataset.inputMethod = 'pointer' }
const keyboardInput = (event: KeyboardEvent) => {
  if (!event.metaKey && !event.altKey && !event.ctrlKey) document.documentElement.dataset.inputMethod = 'keyboard'
}

document.addEventListener('pointerdown', pointerInput, true)
document.addEventListener('keydown', keyboardInput, true)

import.meta.hot?.dispose(() => {
  document.removeEventListener('pointerdown', pointerInput, true)
  document.removeEventListener('keydown', keyboardInput, true)
})
