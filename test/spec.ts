import test from 'ava'

import {join} from 'path'
import {readFileSync} from 'fs'
import * as yaml from 'js-yaml'

import {applyPatch, createPatch} from '../index'
import {Pointer} from '../pointer'

const spec_data = readFileSync(join(__dirname, 'spec.yaml'), {encoding: 'utf8'})
const spec_data_parsed = yaml.load(spec_data)
const spec_patch_results = Object.keys(spec_data_parsed).reduce((results, patch_result_key) => {
  return results.concat(spec_data_parsed[patch_result_key])
}, [])

function clone(object) {
  return JSON.parse(JSON.stringify(object))
}

test('JSON Pointer - rfc-examples', t => {
  // > For example, given the JSON document
  const obj = {
    'foo': ['bar', 'baz'],
    '': 0,
    'a/b': 1,
    'c%d': 2,
    'e^f': 3,
    'g|h': 4,
    'i\\j': 5,
    'k\'l': 6,
    ' ': 7,
    'm~n': 8,
  }

  // > The following JSON strings evaluate to the accompanying values
  const pointers = [
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
  ]

  pointers.forEach(pointer => {
    const actual = Pointer.fromJSON(pointer.path).evaluate(obj).value
    t.deepEqual(actual, pointer.expected, `pointer "${pointer.path}" should evaluate to expected output`)
  })
})

test('JSON Pointer - package example', t => {
  const obj = {
    'first': 'chris',
    'last': 'brown',
    'github': {
      account: {
        id: 'chbrown',
        handle: '@chbrown',
      },
      repos: [
        'amulet', 'twilight', 'rfc6902',
      ],
      stars: [
        {
          owner: 'raspberrypi',
          repo: 'userland',
        },
        {
          owner: 'angular',
          repo: 'angular.js',
        },
      ],
    },
    'github/account': 'deprecated',
  }

  const pointers = [
    {path: '/first', expected: 'chris'},
    {path: '/github~1account', expected: 'deprecated'},
    {path: '/github/account/handle', expected: '@chbrown'},
    {path: '/github/repos', expected: ['amulet', 'twilight', 'rfc6902']},
    {path: '/github/repos/2', expected: 'rfc6902'},
    {path: '/github/stars/0/repo', expected: 'userland'},
  ]

  pointers.forEach(pointer => {
    const actual = Pointer.fromJSON(pointer.path).evaluate(obj).value
    t.deepEqual(actual, pointer.expected, `pointer "${pointer.path}" should evaluate to expected output`)
  })
})

test('Specification format', t => {
  t.deepEqual(spec_patch_results.length, 19, 'should have 19 items')
  // use sorted values and sort() to emulate set equality
  const props = ['diffable', 'input', 'name', 'output', 'patch', 'results']
  spec_patch_results.forEach(spec_patch_result => {
    t.deepEqual(Object.keys(spec_patch_result).sort(), props, `"${spec_patch_result.name}" should have items with specific properties`)
  })
})

// take the input, apply the patch, and check the actual result against the
// expected output
spec_patch_results.forEach(spec_patch_result => {
  test(`patch ${spec_patch_result.name}`, t => {
    // patch operations are applied to object in-place
    const actual = clone(spec_patch_result.input)
    const expected = spec_patch_result.output
    const results = applyPatch(actual, spec_patch_result.patch)
    t.deepEqual(actual, expected, `should equal expected output after applying patches`)
    // since errors are object instances, reduce them to strings to match
    // the spec's results, which has the type `Array<string | null>`
    const results_names = results.map(error => error ? error.name : error)
    t.deepEqual(results_names, spec_patch_result.results, `should produce expected results`)
  })
})

spec_patch_results.filter(item => item.diffable).forEach(spec_patch_result => {
  test(`diff ${spec_patch_result.name}`, t => {
    // we read this separately because patch is destructive and it's easier just to start with a blank slate
    // ignore spec items that are marked as not diffable
    // perform diff (create patch = list of operations) and check result against non-test patches in spec
    const actual = createPatch(spec_patch_result.input, spec_patch_result.output)
    const expected = spec_patch_result.patch.filter(operation => operation.op !== 'test')
    t.deepEqual(actual, expected, `should produce diff equal to spec patch`)
  })
})
