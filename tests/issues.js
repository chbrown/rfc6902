import assert from 'assert';
import {describe, it} from 'mocha';

import {applyPatch, createPatch} from '../index';

function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

describe('issues/3', () => {
  var input = {arr: ['1', '2', '2']};
  var output = {arr: ['1']};
  var expected_patch = [
    {op: 'remove', path: '/arr/1'},
    {op: 'remove', path: '/arr/1'},
  ];
  var actual_patch = createPatch(input, output);
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch);
  });
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input);
    var patch_results = applyPatch(actual_output, actual_patch);
    assert.deepEqual(actual_output, output);
    assert.deepEqual(patch_results, [null, null]);
  });
});

describe('issues/4', () => {
  var input = ['A', 'B'];
  var output = ['B', 'A'];
  var expected_patch = [
    {op: 'add', path: '/0', value: 'B'},
    {op: 'remove', path: '/2'},
  ];
  var actual_patch = createPatch(input, output);
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch);
  });
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input);
    var patch_results = applyPatch(actual_output, actual_patch);
    assert.deepEqual(actual_output, output);
    assert.deepEqual(patch_results, [null, null]);
  });
});

describe('issues/5', () => {
  var input = [];
  var output = ['A', 'B'];
  var expected_patch = [
    {op: 'add', path: '/-', value: 'A'},
    {op: 'add', path: '/-', value: 'B'},
  ];
  var actual_patch = createPatch(input, output);
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch);
  });
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input);
    var patch_results = applyPatch(actual_output, actual_patch);
    assert.deepEqual(actual_output, output);
    assert.deepEqual(patch_results, [null, null]);
  });
});

describe('issues/9', () => {
  var input = [{A: 1, B: 2}, {C: 3}];
  var output = [{A: 1, B: 20}, {C: 3}];
  var expected_patch = [
    {op: 'replace', path: '/0/B', value: 20},
  ];
  var actual_patch = createPatch(input, output);
  it('should produce patch equal to expectation', () => {
    assert.deepEqual(actual_patch, expected_patch);
  });
  it('should apply patch to arrive at output', () => {
    var actual_output = clone(input);
    var patch_results = applyPatch(actual_output, actual_patch);
    assert.deepEqual(actual_output, output);
    assert.deepEqual(patch_results, [null]);
  });
});
