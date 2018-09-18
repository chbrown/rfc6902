import test from 'ava'

import {applyPatch, createPatch} from '../index'
import {clone} from '../util'

const pairs = [
  [
    ['A', 'Z', 'Z'],
    ['A'],
  ],
  [
    ['A', 'B'],
    ['B', 'A'],
  ],
  [
    [],
    ['A', 'B'],
  ],
  [
    ['B', 'A', 'M'],
    ['M', 'A', 'A'],
  ],
  [
    ['A', 'A', 'R'],
    [],
  ],
  [
    ['A', 'B', 'C'],
    ['B', 'C', 'D'],
  ],
  [
    ['A', 'C'],
    ['A', 'B', 'C'],
  ],
  [
    ['A', 'B', 'C'],
    ['A', 'Z'],
  ],
]


pairs.forEach(([input, output]) => {
  test(`diff+patch: [${input}] => [${output}]`, t => {
    const patch = createPatch(input, output)
    const actual_output = clone(input)
    applyPatch(actual_output, patch)
    t.deepEqual(actual_output, output, 'should apply produced patch to arrive at output')
  })
})
