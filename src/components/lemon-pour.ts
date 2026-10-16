/** A gravity-driven ribbon: every cross-section retains its emission time. */
const START = 2.22
const END = 2.8
const SPOUT = { x: 186, y: 92 }
const GRAVITY = 1600
const SPEED_Y = 46
const round = (value: number) => Number(value.toFixed(3))
const ease = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }

function flowAt(time: number) {
  return ease((time - START) / .16) * (1 - ease((time - (END - .2)) / .2))
}

function section(emitted: number, age: number) {
  const vx = -34 + Math.sin((emitted - START) * 9) * 3
  const vy = SPEED_Y + GRAVITY * age
  const speed = Math.hypot(vx, vy)
  const flow = flowAt(emitted)
  return {
    x: SPOUT.x + vx * age + Math.sin(age * 15 - emitted * 9) * 1.25 * ease(age / .09),
    y: SPOUT.y + SPEED_Y * age + GRAVITY * age * age / 2,
    // Acceleration stretches and narrows the stream; variations travel down it.
    radius: (1.5 + 2.6 * Math.sqrt(SPEED_Y / vy)) * Math.sqrt(flow) * (1 + Math.sin(emitted * 23) * .06),
    nx: vy / speed,
    ny: -vx / speed,
    flow,
  }
}

export function createLemonPour(svg: SVGSVGElement) {
  const juice = svg.querySelector('.limon-juice')!
  const ribbon = svg.querySelector('.limon-stream')!
  const glint = svg.querySelector('.limon-stream-glint')!
  const contact = svg.querySelector('.limon-contact')!
  const impact = svg.querySelector('.limon-impact')!
  const ripples = [...svg.querySelectorAll('.limon-ripple')]
  let active = false
  const path = (points: number[][], closed = false) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`).join(' ') + (closed ? 'Z' : '')

  return (time: number, surfaceY: (x: number) => number) => {
    if (time < START || time > 3.5) {
      if (active) { juice.setAttribute('opacity', '0'); contact.setAttribute('opacity', '0') }
      active = false
      return
    }
    active = true
    const fall = (Math.sqrt(SPEED_Y ** 2 + 2 * GRAVITY * (surfaceY(172) - SPOUT.y)) - SPEED_Y) / GRAVITY
    const sections = Array.from({ length: 57 }, (_, i) => {
      const age = i / 56 * fall
      return section(time - age, age)
    }).filter(point => point.flow > .002)

    juice.setAttribute('opacity', sections.length > 1 ? '1' : '0')
    if (sections.length > 1) {
      const left = sections.map(p => [p.x - p.nx * p.radius, p.y - p.ny * p.radius])
      const right = sections.map(p => [p.x + p.nx * p.radius, p.y + p.ny * p.radius])
      ribbon.setAttribute('d', path([...left, ...right.reverse()], true))
      glint.setAttribute('d', path(sections.map(p => [p.x - p.radius * .18, p.y])))
      glint.setAttribute('stroke-dashoffset', String(round(-(time - START) * 120)))
    }

    const landing = section(time - fall, fall)
    contact.setAttribute('opacity', '1')
    impact.setAttribute('cx', String(round(landing.x)))
    impact.setAttribute('cy', String(round(surfaceY(landing.x))))
    impact.setAttribute('rx', String(round(2 + landing.flow * 1.4)))
    impact.setAttribute('opacity', String(round(landing.flow * .28)))

    // Quiet, slightly staggered ripples start only when the juice reaches sauce.
    ripples.forEach((ring, i) => {
      const emitted = START + .11 + i * .17
      const age = time - emitted - fall
      if (age < 0 || age > .32) { ring.setAttribute('opacity', '0'); return }
      const hit = section(emitted, fall)
      const spread = age / .32
      ring.setAttribute('cx', String(round(hit.x)))
      ring.setAttribute('cy', String(round(surfaceY(hit.x))))
      ring.setAttribute('rx', String(round(3 + spread * 5.5)))
      ring.setAttribute('ry', String(round(1 + spread * 1.7)))
      ring.setAttribute('opacity', String(round((1 - spread) ** 2 * hit.flow * .38)))
    })
  }
}
