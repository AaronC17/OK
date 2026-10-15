import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BOWL_RADIUS, floorHeight, GEL_CORE, GEL_RADII, GEL_TRIANGLES,
  SAMPLE_RATE, simulateMix, spineLength, spoonAt, spoonContact, type Point3,
} from './mix-physics.ts'
import { createSauce, displaceSauce, LIQUID_LEVEL, sampleSurface, stepSauce } from './mix-sauce.ts'

const simulation = simulateMix()
const distance = (a: Point3, b: Point3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

test('flexible body parts stay inside the bowl and cannot tunnel through the spoon or each other', () => {
  for (const frame of simulation.frames) {
    const active = frame.bears.filter(bear => bear.active)
    for (const bear of active) bear.lobes.forEach((node, i) => {
      assert.ok(Object.values(node).every(Number.isFinite))
      assert.ok(node.y >= floorHeight(node.x, node.z) + GEL_RADII[i] * GEL_CORE - .1, `floor at ${frame.time}`)
      assert.ok(Math.hypot(node.x, node.z) + GEL_RADII[i] <= BOWL_RADIUS + .1, `wall at ${frame.time}`)
      if (frame.spoon.opacity > .01) {
        const contact = spoonContact(node, frame.spoon)
        assert.ok(distance(node, contact.point) >= GEL_RADII[i] * GEL_CORE + contact.radius - .15, `tool contact at ${frame.time}`)
      }
    })
    for (let a = 0; a < active.length; a++) for (let b = a + 1; b < active.length; b++) {
      active[a].lobes.forEach((first, i) => active[b].lobes.forEach((second, j) => {
        assert.ok(distance(first, second) >= (GEL_RADII[i] + GEL_RADII[j]) * GEL_CORE - .3, `gel contact at ${frame.time}`)
      }))
    }
  }
})

test('head, belly and feet can bend independently without tearing or inverting the photo mesh', () => {
  let bending = 0, compression = 0
  for (let i = 1; i < simulation.frames.length; i++) {
    const frame = simulation.frames[i], previous = simulation.frames[i - 1]
    frame.bears.forEach((bear, index) => {
      if (!bear.active || !previous.bears[index].active) return
      const [head, belly, feet] = bear.lobes
      bending = Math.max(bending, distance(belly, { x: (head.x + feet.x) / 2, y: (head.y + feet.y) / 2, z: (head.z + feet.z) / 2 }))
      for (let j = 0; j < 2; j++) {
        const length = distance(bear.lobes[j], bear.lobes[j + 1])
        assert.ok(length > spineLength * .65 && length < spineLength * 1.35, `gel stretched beyond recovery at ${frame.time}`)
        compression = Math.max(compression, spineLength - length)
      }
      for (const triangle of GEL_TRIANGLES) {
        const [a, b, c] = triangle.map(vertex => bear.mesh[vertex])
        assert.ok((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y) > 0, `folded texture at ${frame.time}`)
      }
      bear.lobes.forEach((node, j) => {
        const before = previous.bears[index].lobes[j]
        assert.ok(Math.hypot(node.squash, node.shear) < .22, `excessive local strain at ${frame.time}`)
        assert.ok(Math.hypot(node.squash - before.squash, node.shear - before.shear) < .04, `strain snapped at ${frame.time}`)
      })
    })
  }
  assert.ok(bending > 2, 'the torso must bow independently of the head and feet')
  assert.ok(compression > 1.5, 'contact must compress the body, not just translate it')
})

test('interpolated browser frames preserve soft tool contact', () => {
  const { frames } = simulation
  for (let i = 1; i < frames.length; i++) {
    const from = frames[i - 1], to = frames[i]
    if (to.time < 5.2 || to.time > 9.4) continue
    for (const amount of [.25, .5, .75]) {
      const spoon = spoonAt(from.time + (to.time - from.time) * amount)
      from.bears.forEach((bear, index) => bear.lobes.forEach((node, j) => {
        const next = to.bears[index].lobes[j]
        const point = { x: node.x + (next.x - node.x) * amount, y: node.y + (next.y - node.y) * amount, z: node.z + (next.z - node.z) * amount }
        const contact = spoonContact(point, spoon)
        assert.ok(distance(point, contact.point) >= GEL_RADII[j] * GEL_CORE + contact.radius - .2, `interpolated tool contact at ${to.time}`)
      }))
    }
  }
})

test('spoon sweeps and dips around a steady grip with a continuous rigid handle', () => {
  const stirring = simulation.frames.filter(frame => frame.time >= 5.0 && frame.time <= 9.3)
  const heads = stirring.map(frame => frame.spoon.x), grips = stirring.map(frame => frame.spoon.grip.x)
  assert.ok(Math.max(...heads) - Math.min(...heads) > 75, 'the head must sweep across the mixture')
  assert.ok(Math.max(...grips) - Math.min(...grips) < 15, 'the hand should pivot rather than translate with the head')
  const depths = stirring.map(frame => frame.spoon.y - floorHeight(frame.spoon.x, frame.spoon.z))
  assert.ok(Math.max(...depths) - Math.min(...depths) > 8, 'the stroke must dip and lift')
  const speeds = stirring.slice(1).map((frame, i) => Math.hypot(frame.spoon.x - stirring[i].spoon.x, frame.spoon.z - stirring[i].spoon.z) * SAMPLE_RATE)
  assert.ok(speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length > 95, 'mixing should have a brisk, continuous cadence')
  assert.ok(Math.max(...speeds) < 155, 'a faster stroke must still turn without sudden bursts')
  for (let i = 2; i < simulation.frames.length; i++) {
    const tool = simulation.frames[i].spoon, previous = simulation.frames[i - 1].spoon, before = simulation.frames[i - 2].spoon
    assert.ok(Math.abs(distance(tool, tool.grip) - 116) < .001, 'handle length must remain constant')
    assert.ok(Math.abs(tool.angle - previous.angle) < 2, 'wrist rotation must be continuous')
    const acceleration = Math.hypot(tool.x - 2 * previous.x + before.x, tool.z - 2 * previous.z + before.z) * SAMPLE_RATE ** 2
    assert.ok(acceleration < 650, `abrupt stroke at ${simulation.frames[i].time}`)
  }
})

test('chamoy retains local relief and damps movement as it slowly levels', () => {
  const sauce = createSauce()
  assert.equal(sampleSurface(sauce.height, 0, 0), LIQUID_LEVEL)
  displaceSauce(sauce, 0, 0, .6)
  const roughness = () => sauce.height.reduce((sum, height) => sum + (height - LIQUID_LEVEL) ** 2, 0)
  const initial = roughness()
  for (let i = 0; i < 180; i++) stepSauce(sauce, { x: 0, y: 60, z: 0 }, 0, 0, 0, 1 / 180)
  const later = roughness()
  assert.ok(later < initial && later > initial * .2, 'chamoy must relax gradually, not instantly flatten')
  assert.ok(sampleSurface(sauce.height, 14, 0) > LIQUID_LEVEL + .5, 'a rounded lip remains near the contact')
  assert.ok(Math.abs(sampleSurface(sauce.height, 70, 0) - LIQUID_LEVEL) < .05, 'an impact should not send water waves to the rim')
  assert.ok(sauce.vx.every(value => Math.abs(value) < .2) && sauce.vz.every(value => Math.abs(value) < .2))
  assert.equal(simulation.impacts.length, simulation.frames[0].bears.length)
  const mixed = simulation.frames.find(frame => frame.time >= 7.5)!
  assert.ok(Math.max(...mixed.surface) - Math.min(...mixed.surface) > 5, 'the spoon must gather and fold the sauce')
  assert.deepEqual(simulateMix(), simulation)
})

test('mixing moves every gummy gently without contact launches', () => {
  const mixing = simulation.frames.filter(frame => frame.time >= 5.0 && frame.time <= 9.3)
  const travel = mixing[0].bears.map(() => 0)
  for (let i = 1; i < mixing.length; i++) {
    mixing[i].bears.forEach((bear, index) => {
      const previous = mixing[i - 1].bears[index]
      travel[index] += distance(bear, previous)
      bear.lobes.forEach((node, j) => {
        assert.ok(distance(node, previous.lobes[j]) < 2.9, `abrupt contact release at ${mixing[i].time}`)
        if (i > 1) {
          const before = mixing[i - 2].bears[index].lobes[j], last = previous.lobes[j]
          const acceleration = Math.hypot(node.x - 2 * last.x + before.x, node.y - 2 * last.y + before.y, node.z - 2 * last.z + before.z) * SAMPLE_RATE ** 2
          assert.ok(acceleration < 4500, `contact kicked a gummy at ${mixing[i].time}`)
        }
        assert.ok(node.y - floorHeight(node.x, node.z) < 60, 'a gummy must not be launched out of the coating')
      })
    })
  }
  assert.ok(travel.every(distance => distance > 18), 'all gummies should participate in the mixture')
})
