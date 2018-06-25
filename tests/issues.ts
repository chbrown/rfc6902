import * as assert from 'assert'
import 'mocha'

import {applyPatch, createPatch} from '../index'
import {diffValues} from '../diff'

function clone(object) {
  return JSON.parse(JSON.stringify(object))
}

describe('issues/3', () => {
  var input = {arr: ['1', '2', '2']}
  var output = {arr: ['1']}
  var expected_patch = [
    {op: 'remove', path: '/arr/1'},
    {op: 'remove', path: '/arr/1'},
  ]
  var actual_patch = createPatch(input, output)
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch)
  })
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input)
    var patch_results = applyPatch(actual_output, actual_patch)
    assert.deepEqual(actual_output, output)
    assert.deepEqual(patch_results, [null, null])
  })
})

describe('issues/4', () => {
  var input = ['A', 'B']
  var output = ['B', 'A']
  var expected_patch = [
    {op: 'add', path: '/0', value: 'B'},
    {op: 'remove', path: '/2'},
  ]
  var actual_patch = createPatch(input, output)
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch)
  })
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input)
    var patch_results = applyPatch(actual_output, actual_patch)
    assert.deepEqual(actual_output, output)
    assert.deepEqual(patch_results, [null, null])
  })
})

describe('issues/5', () => {
  var input = []
  var output = ['A', 'B']
  var expected_patch = [
    {op: 'add', path: '/-', value: 'A'},
    {op: 'add', path: '/-', value: 'B'},
  ]
  var actual_patch = createPatch(input, output)
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch)
  })
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input)
    var patch_results = applyPatch(actual_output, actual_patch)
    assert.deepEqual(actual_output, output)
    assert.deepEqual(patch_results, [null, null])
  })
})

describe('issues/9', () => {
  var input = [{A: 1, B: 2}, {C: 3}]
  var output = [{A: 1, B: 20}, {C: 3}]
  var expected_patch = [
    {op: 'replace', path: '/0/B', value: 20},
  ]
  var actual_patch = createPatch(input, output)
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch)
  })
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input)
    var patch_results = applyPatch(actual_output, actual_patch)
    assert.deepEqual(actual_output, output)
    assert.deepEqual(patch_results, [null])
  })
})

describe('issues/12', () => {
  var input = {name: 'ABC', repositories: ['a', 'e']}
  var output = {name: 'ABC', repositories: ['a', 'b', 'c', 'd', 'e']}
  var expected_patch = [
    {op: 'add', path: '/repositories/1', value: 'b'},
    {op: 'add', path: '/repositories/2', value: 'c'},
    {op: 'add', path: '/repositories/3', value: 'd'},
  ]
  var actual_patch = createPatch(input, output)
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch)
  })
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input)
    var patch_results = applyPatch(actual_output, actual_patch)
    assert.deepEqual(actual_output, output)
    assert.deepEqual(patch_results, [null, null, null])
  })
})

describe('issues/29', () => {
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

  var input = {
    normal: ['a', 'b'],
    stop_recursing: ['a', 'b'],
  }
  var output = {
    normal: ['a'],
    stop_recursing: ['a'],
  }
  var expected_patch = [
    {op: 'remove', path: '/normal/1'},
    {op: 'replace', path: '/stop_recursing', value: ['a']},
  ]
  var actual_patch = createPatch(input, output, customDiff)
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch)
  })
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input)
    var patch_results = applyPatch(actual_output, actual_patch)
    assert.deepEqual(actual_output, output)
    assert.deepEqual(patch_results, [null, null])
  })

  describe('nested', () => {
    var nested_input = {root: input}
    var nested_output = {root: output}
    var nested_expected_patch = [
      {op: 'remove', path: '/root/normal/1'},
      {op: 'replace', path: '/root/stop_recursing', value: ['a']},
    ]
    var nested_actual_patch = createPatch(nested_input, nested_output, customDiff)
    it('should produce patch equal to expectation', () => {
      assert.deepEqual(nested_actual_patch, nested_expected_patch)
    })
    it('should apply patch to arrive at output', () => {
      var actual_output = clone(nested_input)
      var patch_results = applyPatch(actual_output, nested_actual_patch)
      assert.deepEqual(actual_output, nested_output)
      assert.deepEqual(patch_results, [null, null])
    })
  })
})

describe('issues/32', () => {
  var input = 'a'
  var output = 'b'
  var expected_patch = [
    {op: 'replace', path: '', value: 'b'},
  ]
  var actual_patch = createPatch(input, output)
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch)
  })
  // applyPatch fails with error, see #32
  //
  // TypeError: Cannot set property 'null' of null
  // at replace (patch.js:9:2939)
  // at index.js:9:967
  // at Array.map (<anonymous>)
  // at Object.applyPatch (index.js:9:510)
  // at Context.<anonymous> (tests/issues.js:153:37)
  xit('should apply patch to arrive at output', () => {
    var actual_output = clone(input)
    var patch_results = applyPatch(actual_output, actual_patch)
    assert.deepEqual(actual_output, output)
    assert.deepEqual(patch_results, [null])
  })
})
