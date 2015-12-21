import assert from 'assert';
import {describe, it} from 'mocha';
import {applyPatch, createPatch} from '../index';

function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

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
];

describe('array diff+patch identity', () => {
  pairs.forEach(([input, output]) => {
    describe(`${JSON.stringify(input)} → ${JSON.stringify(output)}`, () => {
      it('should apply produced patch to arrive at output', () => {
        var patch = createPatch(input, output);
        var actual_output = clone(input);
        applyPatch(actual_output, patch);
        assert.deepEqual(actual_output, output);
      });
    });
  });
});
