import assert from 'assert';
import {describe, it} from 'mocha';
import {join} from 'path';
import {readFileSync} from 'fs';
import yaml from 'js-yaml';

import {applyPatch, createPatch} from '../index';
import {Pointer} from '../pointer';

var spec_data = readFileSync(join(__dirname, 'spec.yaml'), {encoding: 'utf8'});
var spec_patch_results = yaml.load(spec_data);

function clone(object) {
  return JSON.parse(JSON.stringify(object));
}

describe('JSON Pointer - rfc-examples:', () => {
  // > For example, given the JSON document
  var obj = {
    'foo': ['bar', 'baz'],
    '': 0,
    'a/b': 1,
    'c%d': 2,
    'e^f': 3,
    'g|h': 4,
    'i\\j': 5,
    'k\'l': 6,
    ' ': 7,
    'm~n': 8
  };

  // > The following JSON strings evaluate to the accompanying values
  var pointers = [
    {path: ''      , expected: obj},
    {path: '/foo'  , expected: ['bar', 'baz']},
    {path: '/foo/0', expected: 'bar'},
    {path: '/'     , expected: 0},
    {path: '/a~1b' , expected: 1},
    {path: '/c%d'  , expected: 2},
    {path: '/e^f'  , expected: 3},
    {path: '/g|h'  , expected: 4},
    {path: '/i\\j' , expected: 5},
    {path: '/k\'l' , expected: 6},
    {path: '/ '    , expected: 7},
    {path: '/m~0n' , expected: 8},
  ];

  pointers.forEach(pointer => {
    describe(`pointer "${pointer.path}"`, () => {
      it('should evaluate to expected output', () => {
        var actual = Pointer.fromJSON(pointer.path).evaluate(obj).value;
        assert.deepEqual(actual, pointer.expected);
      });
    });
  });
});

describe('JSON Pointer - package example:', () => {
  var obj = {
    first: 'chris',
    last: 'brown',
    github: {
      account: {
        id: 'chbrown',
        handle: '@chbrown'
      },
      repos: [
        'amulet', 'twilight', 'rfc6902'
      ],
      stars: [
        {
          owner: 'raspberrypi',
          repo: 'userland'
        },
        {
          owner: 'angular',
          repo: 'angular.js'
        },
      ]
    },
    'github/account': 'deprecated'
  };

  var pointers = [
    {path: '/first', expected: 'chris'},
    {path: '/github~1account', expected: 'deprecated'},
    {path: '/github/account/handle', expected: '@chbrown'},
    {path: '/github/repos', expected: ['amulet', 'twilight', 'rfc6902']},
    {path: '/github/repos/2', expected: 'rfc6902'},
    {path: '/github/stars/0/repo', expected: 'userland'},
  ];

  pointers.forEach(pointer => {
    describe(`pointer "${pointer.path}"`, () => {
      it('should evaluate to expected output', () => {
        var actual = Pointer.fromJSON(pointer.path).evaluate(obj).value;
        assert.deepEqual(actual, pointer.expected);
      });
    });
  });
});

describe('Specification format:', () => {
  it('should have 19 items', () => assert.equal(spec_patch_results.length, 19));
  // use sorted values and sort() to emulate set equality
  var props = ['diffable', 'input', 'name', 'output', 'patch', 'results'];
  spec_patch_results.forEach(spec_patch_result => {
    it(`"${spec_patch_result.name}" should have items with specific properties`, () => {
      assert.deepEqual(Object.keys(spec_patch_result).sort(), props);
    });
  });
});

describe('Specification patches:', () => {
  // take the input, apply the patch, and check the actual result against the
  // expected output
  spec_patch_results.forEach(spec_patch_result => {
    describe(spec_patch_result.name, () => {
      // patch operations are applied to object in-place
      var actual = clone(spec_patch_result.input);
      var expected = spec_patch_result.output;
      var results = applyPatch(actual, spec_patch_result.patch);
      it('should equal expected output after applying patches', () => {
        assert.deepEqual(actual, expected);
      });
      // since errors are object instances, reduce them to strings to match
      // the spec's results, which has the type `Array<string | null>`
      var results_names = results.map(error => error ? error.name : error);
      it('should produce expected results', () => {
        assert.deepEqual(results_names, spec_patch_result.results);
      });
    });
  });
});

describe('Specification diffs:', () => {
  spec_patch_results.filter(item => item.diffable).forEach(spec_patch_result => {
    // we read this separately because patch is destructive and it's easier just to start with a blank slate
    // ignore spec items that are marked as not diffable
    describe(spec_patch_result.name, () => {
      // perform diff (create patch = list of operations) and check result against non-test patches in spec
      var actual = createPatch(spec_patch_result.input, spec_patch_result.output);
      var expected = spec_patch_result.patch.filter(operation => operation.op !== 'test');
      it('should produce diff equal to spec patch', () => {
        assert.deepEqual(actual, expected);
      });
    });
  });
});
