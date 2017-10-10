"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
require("mocha");
const index_1 = require("../index");
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
                var patch = index_1.createPatch(input, output);
                var actual_output = clone(input);
                index_1.applyPatch(actual_output, patch);
                assert.deepEqual(actual_output, output);
            });
        });
    });
});
