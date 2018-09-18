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
