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

test('diff of equally cheap alternatives: [A,A] => [A] removes the second A', t => {
  // skipping the common prefix and suffix means ties are broken toward keeping
  // leading elements, so the last of several equal elements gets removed
  t.deepEqual(createPatch(['A', 'A'], ['A']), [{op: 'remove', path: '/1'}])
})

test('diff of arrays uses a custom diff to line up elements', t => {
  // elements with the same id are considered equal, whatever their other fields
  const diff = (input: any, output: any) => {
    if (input?.id !== undefined && input.id === output?.id) {
      return []
    }
  }
  const input = [{id: 1}, {id: 2, x: 1}, {id: 3}]
  const output = [{id: 2, x: 9}, {id: 3}]
  t.deepEqual(createPatch(input, output, diff), [{op: 'remove', path: '/0'}])
})
