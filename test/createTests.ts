import test from 'ava'

import {applyPatch, createTests} from '../index'
import {AddOperation, RemoveOperation, ReplaceOperation, MoveOperation, CopyOperation, TestOperation} from '../diff'

test('simple patch', t => {
  // > For example, given the JSON document
  const obj = {itemCodes: ['123', '456', '789']}

  // > and the following patch
  const patch: RemoveOperation[] = [{op: 'remove', path: '/itemCodes/1'}]

  // > should generate the following test
  const expected: TestOperation[] = [{op: 'test', path: '/itemCodes/1', value: '456'}]

  const actual = createTests(obj, patch)
  t.deepEqual(actual, expected, `patch "${JSON.stringify(patch)}" should generate the expected test`)

  const actualApply = applyPatch(obj, actual)
  t.deepEqual(actualApply, [null], `tests "${JSON.stringify(actual)}" should apply without errors`)
})

test('complex patch', t => {
  // > For example, given the JSON document
  const obj = {
    items: [
      {
        code: '123',
        description: 'item # 123',
        componentCodes: ['456', '789'],
      }, {
        code: '456',
        description: 'item # 456',
        componentCodes: ['789'],
      }, {
        code: '789',
        description: 'item # 789',
        componentCodes: [],
      },
    ],
  }

  // > and the following patch
  const patch: RemoveOperation[] = [{op: 'remove', path: '/items/1'}]

  // > should generate the following test
  const expected: TestOperation[] = [
    {
      op: 'test',
      path: '/items/1',
      value: {
        code: '456',
        description: 'item # 456',
        componentCodes: ['789'],
      },
    },
  ]

  const actual = createTests(obj, patch)
  t.deepEqual(actual, expected, `patch "${JSON.stringify(patch)}" should generate the expected test`)

  const actualApply = applyPatch(obj, actual)
  t.deepEqual(actualApply, [null], `tests "${JSON.stringify(actual)}" should apply without errors`)
})

test('simple patch with add', t => {
  // > For example, given the JSON document
  const obj = {itemCodes: ['123', '456', '789']}

  // > and the following patch
  const patch: AddOperation[] = [{op: 'add', path: '/itemCodes/-', value: 'abc'}]

  // > should generate the following test
  const expected: TestOperation[] = []

  const actual = createTests(obj, patch)
  t.deepEqual(actual, expected, `patch "${JSON.stringify(patch)}" should generate no tests`)
})

test('simple patch with move', t => {
  // > For example, given the JSON document
  const obj = {itemCodes: ['123', '456', '789'], alternateItemCodes: ['abc']}

  // > and the following patch
  const patch: MoveOperation[] = [{op: 'move', from: '/itemCodes/1', path: '/alternateItemCodes/0'}]

  // > should generate the following test
  const expected: TestOperation[] = [
    {op: 'test', path: '/alternateItemCodes/0', value: 'abc'},
    {op: 'test', path: '/itemCodes/1', value: '456'},
  ]

  const actual = createTests(obj, patch)
  t.deepEqual(actual, expected, `patch "${JSON.stringify(patch)}" should generate no tests`)

  const actualApply = applyPatch(obj, actual)
  t.deepEqual(actualApply, [null, null], `tests "${JSON.stringify(actual)}" should apply without errors`)
})

test('simple patch with copy', t => {
  // > For example, given the JSON document
  const obj = {itemCodes: ['123', '456', '789'], alternateItemCodes: []}

  // > and the following patch
  const patch: CopyOperation[] = [
    {
      op: 'copy',
      from: '/itemCodes/1',
      path: '/alternateItemCodes/0',
    },
  ]

  // > should generate the following test
  const expected: TestOperation[] = [
    {op: 'test', path: '/alternateItemCodes/0', value: undefined},
    {op: 'test', path: '/itemCodes/1', value: '456'},
  ]

  const actual = createTests(obj, patch)
  t.deepEqual(actual, expected, `patch "${JSON.stringify(patch)}" should generate no tests`)

  const actualApply = applyPatch(obj, actual)
  t.deepEqual(actualApply, [null, null], `tests "${JSON.stringify(actual)}" should apply without errors`)
})

test('simple patch with replace', t => {
  // > For example, given the JSON document
  const obj = {itemCodes: ['123', '456', '789']}

  // > and the following patch
  const patch: ReplaceOperation[] = [{op: 'replace', path: '/itemCodes/1', value: 'abc'}]

  // > should generate the following test
  const expected: TestOperation[] = [{op: 'test', path: '/itemCodes/1', value: '456'}]

  const actual = createTests(obj, patch)
  t.deepEqual(actual, expected, `patch "${JSON.stringify(patch)}" should generate the expected test`)

  const actualApply = applyPatch(obj, actual)
  t.deepEqual(actualApply, [null], `tests "${JSON.stringify(actual)}" should apply without errors`)
})
