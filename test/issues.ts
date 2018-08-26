import test, {ExecutionContext} from 'ava'

import {applyPatch, createPatch} from '../index'
import {diffValues, Operation} from '../diff'

function clone(object) {
  return JSON.parse(JSON.stringify(object))
}

function checkRoundtrip(t: ExecutionContext,
                        input: any,
                        output: any,
                        expected_patch: Operation[],
                        actual_patch: Operation[] = createPatch(input, output)) {
  t.deepEqual(actual_patch, expected_patch, 'should produce patch equal to expectation')
  const actual_output = clone(input)
  const patch_results = applyPatch(actual_output, actual_patch)
  t.deepEqual(actual_output, output, 'should apply patch to arrive at output')
  t.deepEqual(patch_results.length, actual_patch.length, 'should apply all patches')
  t.true(patch_results.every(result => result == null), 'should apply patch successfully')
}

test('issues/3', t => {
  const input = {arr: ['1', '2', '2']}
  const output = {arr: ['1']}
  const expected_patch: Operation[] = [
    {op: 'remove', path: '/arr/1'},
    {op: 'remove', path: '/arr/1'},
  ]
  checkRoundtrip(t, input, output, expected_patch)
})

test('issues/4', t => {
  const input = ['A', 'B']
  const output = ['B', 'A']
  const expected_patch: Operation[] = [
    {op: 'add', path: '/0', value: 'B'},
    {op: 'remove', path: '/2'},
  ]
  checkRoundtrip(t, input, output, expected_patch)
})

test('issues/5', t => {
  const input = []
  const output = ['A', 'B']
  const expected_patch: Operation[] = [
    {op: 'add', path: '/-', value: 'A'},
    {op: 'add', path: '/-', value: 'B'},
  ]
  checkRoundtrip(t, input, output, expected_patch)
})

test('issues/9', t => {
  const input = [{A: 1, B: 2}, {C: 3}]
  const output = [{A: 1, B: 20}, {C: 3}]
  const expected_patch: Operation[] = [
    {op: 'replace', path: '/0/B', value: 20},
  ]
  checkRoundtrip(t, input, output, expected_patch)
})

test('issues/12', t => {
  const input = {name: 'ABC', repositories: ['a', 'e']}
  const output = {name: 'ABC', repositories: ['a', 'b', 'c', 'd', 'e']}
  const expected_patch: Operation[] = [
    {op: 'add', path: '/repositories/1', value: 'b'},
    {op: 'add', path: '/repositories/2', value: 'c'},
    {op: 'add', path: '/repositories/3', value: 'd'},
  ]
  checkRoundtrip(t, input, output, expected_patch)
})

test('issues/29', t => {
  /**
  Custom diff function that short-circuits recursion when the last token
  in the current pointer is the key "stop_recursing", such that that key's
  values are compared as primitives rather than objects/arrays.
  */
  function customDiff(input, output, ptr) {
    if (ptr.tokens[ptr.tokens.length - 1] === 'stop_recursing') {
      // do not compare arrays, replace instead
      return diffValues(input, output, ptr)
    }
  }

  const input = {
    normal: ['a', 'b'],
    stop_recursing: ['a', 'b'],
  }
  const output = {
    normal: ['a'],
    stop_recursing: ['a'],
  }
  const expected_patch: Operation[] = [
    {op: 'remove', path: '/normal/1'},
    {op: 'replace', path: '/stop_recursing', value: ['a']},
  ]
  const actual_patch = createPatch(input, output, customDiff)
  checkRoundtrip(t, input, output, expected_patch, actual_patch)

  const nested_input = {root: input}
  const nested_output = {root: output}
  const nested_expected_patch: Operation[] = [
    {op: 'remove', path: '/root/normal/1'},
    {op: 'replace', path: '/root/stop_recursing', value: ['a']},
  ]
  const nested_actual_patch = createPatch(nested_input, nested_output, customDiff)
  checkRoundtrip(t, nested_input, nested_output, nested_expected_patch, nested_actual_patch)
})

test('issues/32', t => {
  const input = 'a'
  const output = 'b'
  const expected_patch: Operation[] = [
    {op: 'replace', path: '', value: 'b'},
  ]
  const actual_patch = createPatch(input, output)
  t.deepEqual(actual_patch, expected_patch, 'should produce patch equal to expectation')
})

test.failing('issues/32 problem', t => {
  const input = 'a'
  const output = 'b'
  const expected_patch: Operation[] = [
    {op: 'replace', path: '', value: 'b'},
  ]
  const actual_patch = createPatch(input, output)
  // applyPatch fails with error, see #32
  //
  // TypeError: Cannot set property 'null' of null
  // at replace (patch.js:9:2939)
  // at index.js:9:967
  // at Array.map (<anonymous>)
  // at Object.applyPatch (index.js:9:510)
  // at Context.<anonymous> (tests/issues.js:153:37)
  const actual_output = clone(input)
  const patch_results = applyPatch(actual_output, actual_patch)
  t.deepEqual(actual_output, output, 'should apply patch to arrive at output')
  t.deepEqual(patch_results, [null])
})

test.failing('issues/35', t => {
  const input = {name: 'bob', image: undefined, cat: null}
  const output = {name: 'bob', image: 'foo.jpg', cat: 'nikko'}
  const expected_patch: Operation[] = [
    {op: 'replace', path: '/image', value: 'foo.jpg'},
    {op: 'replace', path: '/cat', value: 'nikko'},
  ]
  checkRoundtrip(t, input, output, expected_patch)
})
