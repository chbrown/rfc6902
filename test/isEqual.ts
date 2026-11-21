import test from 'ava'

import {diffAny, isEqual} from '../diff'
import {Pointer} from '../pointer'

/** Seeded PRNG (mulberry32), so failures can be reproduced */
function createRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Point {
  constructor(public x: any) {}
}

const primitives = [0, -0, 1, NaN, '', 'a', 'b', true, false, null, undefined]

/** Generate a random value from a small space, so that equal values are common */
function randomValue(random: () => number, depth = 0): any {
  const pick = <T>(xs: T[]): T => xs[Math.floor(random() * xs.length)]
  const size = () => Math.floor(random() * 3)
  const r = random()
  if (depth > 2 || r < 0.35) {
    return pick(primitives)
  }
  if (r < 0.5) {
    return Array.from({length: size()}, () => randomValue(random, depth + 1))
  }
  if (r < 0.7) {
    const object: {[index: string]: any} = {}
    for (let i = size(); i > 0; i--) {
      object[pick(['a', 'b', 'c'])] = randomValue(random, depth + 1)
    }
    return object
  }
  if (r < 0.77) {
    return new Date(pick([0, 1, NaN]))
  }
  if (r < 0.84) {
    return new Map(Array.from({length: size()}, () => [pick(['a', 'b']), randomValue(random, depth + 1)] as [string, any]))
  }
  if (r < 0.91) {
    return new Set(Array.from({length: size()}, () => randomValue(random, depth + 1)))
  }
  if (r < 0.96) {
    return new Point(randomValue(random, depth + 1))
  }
  return pick([/a/, /b/])
}

test('isEqual agrees with diffAny', t => {
  const seeds = createRandom(1)
  const mismatches: string[] = []
  let equal_count = 0
  for (let n = 0; n < 20000; n++) {
    const input_seed = Math.floor(seeds() * 2 ** 32)
    // half the time, generate structurally equal (but not identical) values
    const output_seed = seeds() < 0.5 ? input_seed : Math.floor(seeds() * 2 ** 32)
    const input = randomValue(createRandom(input_seed))
    const output = randomValue(createRandom(output_seed))
    const expected = !diffAny(input, output, new Pointer()).length
    if (isEqual(input, output) !== expected) {
      mismatches.push(`seeds ${input_seed}, ${output_seed}: diffAny says ${expected ? 'equal' : 'unequal'}`)
    }
    if (expected) {
      equal_count++
    }
  }
  t.deepEqual(mismatches, [])
  // make sure the test isn't vacuous
  t.true(equal_count > 5000, `only ${equal_count} equal pairs`)
})
