import test from 'ava'

import {applyPatch} from '../index'

import {resultName} from './_index'

test('broken add', t => {
  const user = {id: 'chbrown'}
  const results = applyPatch(user, [
    {op: 'add', path: '/a/b', value: 1},
  ])
  t.deepEqual(user, {id: 'chbrown'}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('broken add (array does not exist)', t => {
  const user = {id: 'chbrown'}
  const results = applyPatch(user, [
    {op: 'add', path: '/tag/-', value: 1},
  ])
  t.deepEqual(user, {id: 'chbrown'}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('working add (array exists)', t => {
  const user = {id: 'chbrown', tag: []}
  const results = applyPatch(user, [
    {op: 'add', path: '/tag/-', value: 123},
  ])
  t.deepEqual(results, [null], 'should succeed')
  t.deepEqual(user, {id: 'chbrown', tag: [123]}, 'should add tag')
})

test('working add (array exists and non-empty)', t => {
  const user = {id: 'chbrown', tag: [999]}
  const results = applyPatch(user, [
    {op: 'add', path: '/tag/-', value: 123},
  ])
  t.deepEqual(results, [null], 'should succeed')
  t.deepEqual(user, {id: 'chbrown', tag: [999, 123]}, 'should add tag')
})

test('broken remove', t => {
  const user = {id: 'chbrown'}
  const results = applyPatch(user, [
    {op: 'remove', path: '/name'},
  ])
  t.deepEqual(user, {id: 'chbrown'}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('broken replace', t => {
  const user = {id: 'chbrown'}
  const results = applyPatch(user, [
    {op: 'replace', path: '/name', value: 1},
  ])
  t.deepEqual(user, {id: 'chbrown'}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('broken replace (array)', t => {
  const users = [{id: 'chbrown'}]
  const results = applyPatch(users, [
    {op: 'replace', path: '/1', value: {id: 'chbrown2'}},
  ])
  // cf. issues/36
  t.deepEqual(users, [{id: 'chbrown'}], 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('broken move (from)', t => {
  const user = {id: 'chbrown'}
  const results = applyPatch(user, [
    {op: 'move', from: '/name', path: '/id'},
  ])
  t.deepEqual(user, {id: 'chbrown'}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('broken move (path)', t => {
  const user = {id: 'chbrown'}
  const results = applyPatch(user, [
    {op: 'move', from: '/id', path: '/a/b'},
  ])
  t.deepEqual(user, {id: 'chbrown'}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('broken copy (from)', t => {
  const user = {id: 'chbrown'}
  const results = applyPatch(user, [
    {op: 'copy', from: '/name', path: '/id'},
  ])
  t.deepEqual(user, {id: 'chbrown'}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('broken copy (path)', t => {
  const user = {id: 'chbrown'}
  const results = applyPatch(user, [
    {op: 'copy', from: '/id', path: '/a/b'},
  ])
  t.deepEqual(user, {id: 'chbrown'}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

// Option: implicitArrayCreation

test('creates missing top-level array', t => {
  const object = {}
  const results = applyPatch(object, [
    {op: 'add', path: '/identifier/-', value: {system: 'mrn'}},
  ], {implicitArrayCreation: true})
  t.deepEqual(results, [null])
  t.deepEqual(object, {identifier: [{system: 'mrn'}]})
})

test('creates missing nested array when parent exists', t => {
  const object = {meta: {}}
  const results = applyPatch(object, [
    {op: 'add', path: '/meta/tag/-', value: 'x'},
  ], {implicitArrayCreation: true})
  t.deepEqual(results, [null])
  t.deepEqual(object, {meta: {tag: ['x']}})
})

test('multiple appends to created array', t => {
  const object = {meta: {}}
  const results = applyPatch(object, [
    {op: 'add', path: '/meta/tag/-', value: 'a'},
    {op: 'add', path: '/meta/tag/-', value: 'b'},
  ], {implicitArrayCreation: true})
  t.deepEqual(results, [null, null])
  t.deepEqual(object, {meta: {tag: ['a', 'b']}})
})

test('fails when parent object missing', t => {
  const object = {}
  const results = applyPatch(object, [
    {op: 'add', path: '/meta/tag/-', value: 'x'},
  ], {implicitArrayCreation: true})
  t.deepEqual(results.map(resultName), ['MissingError'])
})

test('fails when parent is not object (value)', t => {
  const object = {meta: true}
  const results = applyPatch(object, [
    {op: 'add', path: '/meta/tag/-', value: 'x'},
  ], {implicitArrayCreation: true})
  t.deepEqual(results.map(resultName), ['MissingError'])
})

test('fails when parent is not object (array)', t => {
  const object = {meta: []}
  const results = applyPatch(object, [
    {op: 'add', path: '/meta/tag/-', value: 'x'},
  ], {implicitArrayCreation: true})
  t.deepEqual(results.map(resultName), ['MissingError'])
})

test('fails when parent is not object (null)', t => {
  const object = {meta: null}
  const results = applyPatch(object, [
    {op: 'add', path: '/meta/tag/-', value: 'x'},
  ], {implicitArrayCreation: true})
  t.deepEqual(results.map(resultName), ['MissingError'])
})

test('fails on existing non-array property (value)', t => {
  const object = {a: 1}
  const results = applyPatch(object, [
    {op: 'add', path: '/a/-', value: 2},
  ], {implicitArrayCreation: true})
  t.deepEqual(results.map(resultName), ['MissingError'])
})

test('fails on existing non-array property (object)', t => {
  const object = {a: {b: 2}}
  const results = applyPatch(object, [
    {op: 'add', path: '/a/-', value: 2},
  ], {implicitArrayCreation: true})
  t.deepEqual(results.map(resultName), ['MissingError'])
})

test('fails on non-terminal /-', t => {
  const object = {}
  const results = applyPatch(object, [
    {op: 'add', path: '/list/-/name', value: 'x'},
  ], {implicitArrayCreation: true})
  t.deepEqual(results.map(resultName), ['MissingError'])
})
