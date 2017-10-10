import * as assert from 'assert'
import 'mocha'

import {applyPatch, createTests} from '../index'
import {AddOperation, RemoveOperation, ReplaceOperation, MoveOperation, CopyOperation} from '../diff'

describe('createTests for simple patch:', () => {
  // > For example, given the JSON document
  const obj = {"itemCodes": ["123", "456", "789"]}

  // > and the following patch
  const patch: RemoveOperation[] = [{op: 'remove', path: '/itemCodes/1'}]

  // > should generate the following test
  const expected = [{op: 'test', path: '/itemCodes/1', value: "456"}]

  const actual = createTests(obj, patch)
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate the expected test', () => {
      assert.deepEqual(actual, expected)
    })
  })

  const actualApply = applyPatch(obj, actual)
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null])
    })
  })
})

describe('createTests for complex patch:', () => {
  // > For example, given the JSON document
  const obj = {
    "items": [
      {
        "code": "123",
        "description": "item # 123",
        "componentCodes": ["456", "789"],
      }, {
        "code": "456",
        "description": "item # 456",
        "componentCodes": ["789"],
      }, {
        "code": "789",
        "description": "item # 789",
        "componentCodes": [],
      },
    ],
  }

  // > and the following patch
  const patch: RemoveOperation[] = [{op: 'remove', path: '/items/1'}]

  // > should generate the following test
  const expected = [
    {
      op: 'test',
      path: '/items/1',
      value: {
        "code": "456",
        "description": "item # 456",
        "componentCodes": ["789"],
      },
    },
  ]

  const actual = createTests(obj, patch)
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate the expected test', () => {
      assert.deepEqual(actual, expected)
    })
  })

  const actualApply = applyPatch(obj, actual)
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null])
    })
  })
})

describe('createTests for simple patch with add:', () => {
  // > For example, given the JSON document
  const obj = {"itemCodes": ["123", "456", "789"]}

  // > and the following patch
  const patch: AddOperation[] = [{op: 'add', path: '/itemCodes/-', value: "abc"}]

  // > should generate the following test
  const expected = []

  const actual = createTests(obj, patch)
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate no tests', () => {
      assert.deepEqual(actual, expected)
    })
  })
})

describe('createTests for simple patch with move:', () => {
  // > For example, given the JSON document
  const obj = {"itemCodes": ["123", "456", "789"], alternateItemCodes: ["abc"]}

  // > and the following patch
  const patch: MoveOperation[] = [{op: 'move', from: '/itemCodes/1', path: '/alternateItemCodes/0'}]

  // > should generate the following test
  const expected = [
    {op: 'test', path: '/alternateItemCodes/0', value: "abc"},
    {op: 'test', path: '/itemCodes/1', value: "456"},
  ]

  const actual = createTests(obj, patch)
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate no tests', () => {
      assert.deepEqual(actual, expected)
    })
  })

  const actualApply = applyPatch(obj, actual)
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null, null])
    })
  })
})

describe('createTests for simple patch with copy:', () => {
  // > For example, given the JSON document
  const obj = {"itemCodes": ["123", "456", "789"], alternateItemCodes: []}

  // > and the following patch
  const patch: CopyOperation[] = [
    {
      op: 'copy',
      from: '/itemCodes/1',
      path: '/alternateItemCodes/0',
    },
  ]

  // > should generate the following test
  const expected = [
    {op: 'test', path: '/alternateItemCodes/0', value: undefined},
    {op: 'test', path: '/itemCodes/1', value: "456"},
  ]

  const actual = createTests(obj, patch)
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate no tests', () => {
      assert.deepEqual(actual, expected)
    })
  })

  const actualApply = applyPatch(obj, actual)
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null, null])
    })
  })
})

describe('createTests for simple patch with replace:', () => {
  // > For example, given the JSON document
  const obj = {"itemCodes": ["123", "456", "789"]}

  // > and the following patch
  const patch: ReplaceOperation[] = [{op: 'replace', path: '/itemCodes/1', value: "abc"}]

  // > should generate the following test
  const expected = [{op: 'test', path: '/itemCodes/1', value: "456"}]

  const actual = createTests(obj, patch)
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate the expected test', () => {
      assert.deepEqual(actual, expected)
    })
  })

  const actualApply = applyPatch(obj, actual)
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null])
    })
  })
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate to expected test', () => {
      const actual = createTests(obj, patch)
      assert.deepEqual(actual, expected)
    })
  })
})
