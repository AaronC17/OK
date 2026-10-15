import { useId } from 'react'

export const gummyImages = ['amber', 'ruby', 'citrus', 'gold'] as const

/** Actual supplied photos, trimmed and optimized locally with alpha preserved. */
export function GummyDefinitions({ id }: { id: string }) {
  return <defs>{gummyImages.map(image => <image
    key={image} id={`${id}-bear-${image}`}
    href={`/images/mix/bear-${image}.webp`}
    xlinkHref={`/images/mix/bear-${image}.webp`}
    x="-14" y="-20.5" width="28" height="41" preserveAspectRatio="xMidYMid meet"
  />)}</defs>
}

export function PackagedGummies() {
  const id = useId().replaceAll(':', '')
  return <svg className="packaged-gummies" viewBox="0 0 100 75" fill="none" focusable="false">
    <GummyDefinitions id={id} />
    {[
      [24, 17, -24, 'amber'], [52, 17, 19, 'ruby'], [78, 23, 25, 'citrus'],
      [20, 51, -23, 'citrus'], [49, 50, 12, 'gold'], [77, 54, -17, 'ruby'],
    ].map(([x, y, rotation, image], index) => <use key={index} href={`#${id}-bear-${image}`} xlinkHref={`#${id}-bear-${image}`} transform={`translate(${x} ${y}) rotate(${rotation}) scale(.9)`} />)}
  </svg>
}
