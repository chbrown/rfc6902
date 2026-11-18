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

test('add to the root pointer "" returns MissingError instead of throwing', t => {
  const user = {a: 1}
  const results = applyPatch(user, [
    {op: 'add', path: '', value: {b: 2}},
  ])
  t.deepEqual(user, {a: 1}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('remove at the root pointer "" returns MissingError instead of throwing', t => {
  const user = {a: 1}
  const results = applyPatch(user, [
    {op: 'remove', path: ''},
  ])
  t.deepEqual(user, {a: 1}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('move to the root pointer "" returns MissingError instead of throwing', t => {
  const user = {a: 1}
  const results = applyPatch(user, [
    {op: 'move', from: '/a', path: ''},
  ])
  t.deepEqual(user, {a: 1}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

test('copy to the root pointer "" returns MissingError instead of throwing', t => {
  const user = {a: 1}
  const results = applyPatch(user, [
    {op: 'copy', from: '/a', path: ''},
  ])
  t.deepEqual(user, {a: 1}, 'should change nothing')
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

test('move into own child returns MissingError instead of destroying data', t => {
  // RFC 6902 4.4: "The 'from' location MUST NOT be a proper prefix of the
  // 'path' location; i.e., a location cannot be moved into one of its children."
  const doc = {a: {b: {}}}
  const results = applyPatch(doc, [
    {op: 'move', from: '/a', path: '/a/b/c'},
  ])
  t.deepEqual(doc, {a: {b: {}}}, 'should change nothing')
  t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
})

// JSON strings, numbers, booleans, and null have no members, so a path cannot descend into them
const memberlessValues = ['chbrown@example.com', 100, true, null]

memberlessValues.forEach(value => {
  const name = JSON.stringify(value)

  test(`add under ${name} returns MissingError instead of throwing`, t => {
    const user = {id: value}
    const results = applyPatch(user, [
      {op: 'add', path: '/id/domain', value: 'example.com'},
    ])
    t.deepEqual(user, {id: value}, 'should change nothing')
    t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
  })

  test(`replace under ${name} returns MissingError instead of throwing`, t => {
    const user = {id: value}
    const results = applyPatch(user, [
      {op: 'replace', path: '/id/length', value: 1},
    ])
    t.deepEqual(user, {id: value}, 'should change nothing')
    t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
  })

  test(`remove under ${name} returns MissingError instead of throwing`, t => {
    const user = {id: value}
    const results = applyPatch(user, [
      {op: 'remove', path: '/id/0'},
    ])
    t.deepEqual(user, {id: value}, 'should change nothing')
    t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
  })

  test(`copy under ${name} returns MissingError instead of throwing`, t => {
    const user = {id: value, name: 'Chris'}
    const results = applyPatch(user, [
      {op: 'copy', from: '/name', path: '/id/domain'},
    ])
    t.deepEqual(user, {id: value, name: 'Chris'}, 'should change nothing')
    t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
  })

  test(`move under ${name} returns MissingError instead of losing the source`, t => {
    const user = {id: value, name: 'Chris'}
    const results = applyPatch(user, [
      {op: 'move', from: '/name', path: '/id/domain'},
    ])
    t.deepEqual(user, {id: value, name: 'Chris'}, 'should change nothing')
    t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
  })

  test(`copy from under ${name} returns MissingError`, t => {
    const user = {id: value}
    const results = applyPatch(user, [
      {op: 'copy', from: '/id/length', path: '/length'},
    ])
    t.deepEqual(user, {id: value}, 'should change nothing')
    t.deepEqual(results.map(resultName), ['MissingError'], 'should result in MissingError')
  })
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

// adapted from #114 (https://github.com/chbrown/rfc6902/pull/114) by @MildlyMeticulous
const invalidArrayIndexTokens = ['-1', '-2', '00', '01', '1.5', '1e0', '+1', ' 1', 'bar', 'length', 'push']

invalidArrayIndexTokens.forEach(token => {
  test(`add fails on invalid array index token ${JSON.stringify(token)}`, t => {
    const object = {bar: [1, 2]}
    const results = applyPatch(object, [
      {op: 'add', path: `/bar/${token}`, value: 'X'},
    ])
    t.deepEqual(results.map(resultName), ['MissingError'])
    t.deepEqual(object, {bar: [1, 2]}, 'should change nothing')
  })

  test(`replace fails on invalid array index token ${JSON.stringify(token)}`, t => {
    const object = {bar: [1, 2]}
    const results = applyPatch(object, [
      {op: 'replace', path: `/bar/${token}`, value: 'X'},
    ])
    t.deepEqual(results.map(resultName), ['MissingError'])
    t.deepEqual(object, {bar: [1, 2]}, 'should change nothing')
  })

  test(`copy fails on invalid array index token ${JSON.stringify(token)}`, t => {
    const object = {bar: [1, 2], src: 'S'}
    const results = applyPatch(object, [
      {op: 'copy', from: '/src', path: `/bar/${token}`},
    ])
    t.deepEqual(results.map(resultName), ['MissingError'])
    t.deepEqual(object, {bar: [1, 2], src: 'S'}, 'should change nothing')
  })

  test(`move fails on invalid array index token ${JSON.stringify(token)}`, t => {
    const object = {bar: [1, 2], src: 'S'}
    const results = applyPatch(object, [
      {op: 'move', from: '/src', path: `/bar/${token}`},
    ])
    t.deepEqual(results.map(resultName), ['MissingError'])
    t.deepEqual(object, {bar: [1, 2], src: 'S'}, 'should change nothing')
  })

  test(`remove fails on invalid array index token ${JSON.stringify(token)}`, t => {
    const object = {bar: [1, 2]}
    const results = applyPatch(object, [
      {op: 'remove', path: `/bar/${token}`},
    ])
    t.deepEqual(results.map(resultName), ['MissingError'])
    t.deepEqual(object, {bar: [1, 2]}, 'should change nothing')
  })

  test(`traversal fails through invalid array index token ${JSON.stringify(token)}`, t => {
    const object = {bar: [{}, {}]}
    const results = applyPatch(object, [
      {op: 'add', path: `/bar/${token}/x`, value: 'X'},
    ])
    t.deepEqual(results.map(resultName), ['MissingError'])
    t.deepEqual(object, {bar: [{}, {}]}, 'should change nothing')
  })
})

test('replace fails on out-of-bounds array index', t => {
  const object = {bar: [1, 2]}
  const results = applyPatch(object, [
    {op: 'replace', path: '/bar/2', value: 'X'},
  ])
  t.deepEqual(results.map(resultName), ['MissingError'])
  t.deepEqual(object, {bar: [1, 2]}, 'should change nothing')
})

test('replace succeeds on a valid array index', t => {
  const object = {bar: [1, 2]}
  const results = applyPatch(object, [
    {op: 'replace', path: '/bar/1', value: 'X'},
  ])
  t.deepEqual(results, [null])
  t.deepEqual(object, {bar: [1, 'X']})
})

test('copy succeeds at the append position', t => {
  const object = {bar: [1, 2], src: 'S'}
  const results = applyPatch(object, [
    {op: 'copy', from: '/src', path: '/bar/2'},
  ])
  t.deepEqual(results, [null])
  t.deepEqual(object, {bar: [1, 2, 'S'], src: 'S'})
})

test('move succeeds at the terminal dash', t => {
  const object = {bar: [1, 2], src: 'S'}
  const results = applyPatch(object, [
    {op: 'move', from: '/src', path: '/bar/-'},
  ])
  t.deepEqual(results, [null])
  t.deepEqual(object, {bar: [1, 2, 'S']})
})
