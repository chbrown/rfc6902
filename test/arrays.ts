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

// array items are compared with the same notion of equality as the default diff
const equality_cases: [string, any[], any[], any[]][] = [
  ['keys with undefined values are ignored', [{a: 1, b: undefined}], [{a: 1}], []],
  ['arrays of different lengths differ', [[1, 2]], [[1, 2, 3]], [{op: 'add', path: '/0/-', value: 3}]],
  [
    'nested values are compared deeply',
    [{a: {b: [1, {c: 2}]}}, 'x'],
    [{a: {b: [1, {c: 3}]}}, 'x'],
    [{op: 'replace', path: '/0/a/b/1/c', value: 3}],
  ],
  ['an extra key in the output differs', [{a: 1}], [{a: 1, b: 2}], [{op: 'add', path: '/0/b', value: 2}]],
  ['values of different types differ', [1, '1'], [1, 1], [{op: 'replace', path: '/1', value: 1}]],
]

equality_cases.forEach(([name, input, output, expected]) => {
  test(`diff: array item equality: ${name}`, t => {
    t.deepEqual(createPatch(input, output), expected)
  })
})
