import assert from 'assert';
import {describe, it} from 'mocha';

import {applyPatch, createTests} from '../index';

describe('createTests for simple patch:', () => {
  // > For example, given the JSON document
  var obj = { "itemCodes": [ "123", "456", "789" ] };

  // > and the following patch
  var patch = [ {op: 'remove', path: '/itemCodes/1'} ];

  // > should generate the following test
  var expected = [ {op: 'test', from: '', path: '/itemCodes/1', value: "456"} ];

  var actual = createTests(obj, patch);
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate the expected test', () => {
      assert.deepEqual(actual, expected);
    });
  });

  var actualApply = applyPatch(obj, actual);
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null]);
    });
  });
});

describe('createTests for complex patch:', () => {
  // > For example, given the JSON document
  var obj = {
    "items": [ {
      "code": "123", 
      "description": "item # 123",
      "componentCodes": [ "456", "789" ]
    }, {
      "code": "456", 
      "description": "item # 456",
      "componentCodes": [ "789" ]
    }, {
      "code": "789", 
      "description": "item # 789",
      "componentCodes": [ ]
    } ] };

  // > and the following patch
  var patch = [ {op: 'remove', path: '/items/1'} ];

  // > should generate the following test
  var expected = [
      {
        op: 'test',
        from: '',
        path: '/items/1',
        value: {                                                                          "code": "456",
          "description": "item # 456",
          "componentCodes": [ "789" ]
        }
      } ];

  var actual = createTests(obj, patch);
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate the expected test', () => {
      assert.deepEqual(actual, expected);
    });
  });

  var actualApply = applyPatch(obj, actual);
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null]);
    });
  });
});

describe('createTests for simple patch with add:', () => {
  // > For example, given the JSON document
  var obj = { "itemCodes": [ "123", "456", "789" ] };

  // > and the following patch
  var patch = [ {op: 'add', path: '/itemCodes/-', value: "abc"} ];

  // > should generate the following test
  var expected = [ ];

  var actual = createTests(obj, patch);
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate no testis', () => {
      assert.deepEqual(actual, expected);
    });
  });
});

describe('createTests for simple patch with move:', () => {
  // > For example, given the JSON document
  var obj = { "itemCodes": [ "123", "456", "789" ], alternateItemCodes: [ "abc" ] };

  // > and the following patch
  var patch = [ {op: 'move', from: '/itemCodes/1', path: '/alternateItemCodes/0'} ];

  // > should generate the following test
  var expected = [
    {op: 'test', from: '', path: '/alternateItemCodes/0', value: "abc"},
    {op: 'test', from: '', path: '/itemCodes/1', value: "456"}
  ];

  var actual = createTests(obj, patch);
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate no testis', () => {
      assert.deepEqual(actual, expected);
    });
  });

  var actualApply = applyPatch(obj, actual);
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null, null]);
    });
  });
});

describe('createTests for simple patch with copy:', () => {
  // > For example, given the JSON document
  var obj = { "itemCodes": [ "123", "456", "789" ], alternateItemCodes: [] };

  // > and the following patch
  var patch = [ {op: 'copy', from: '/itemCodes/1', path: '/alternateItemCodes/0', value: "abc"} ];

  // > should generate the following test
  var expected = [
    {op: 'test', from: '', path: '/alternateItemCodes/0', value: undefined},
    {op: 'test', from: '', path: '/itemCodes/1', value: "456"}
  ];

  var actual = createTests(obj, patch);
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate no testis', () => {
      assert.deepEqual(actual, expected);
    });
  });

  var actualApply = applyPatch(obj, actual);
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null, null]);
    });
  });
});

describe('createTests for simple patch with replace:', () => {
  // > For example, given the JSON document
  var obj = { "itemCodes": [ "123", "456", "789" ] };

  // > and the following patch
  var patch = [ {op: 'replace', path: '/itemCodes/1', value: "abc"} ];

  // > should generate the following test
  var expected = [ {op: 'test', from: '', path: '/itemCodes/1', value: "456"} ];

  var actual = createTests(obj, patch);
  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate the expected test', () => {
      assert.deepEqual(actual, expected);
    });
  });

  var actualApply = applyPatch(obj, actual);
  describe(`tests "${JSON.stringify(actual)}"`, () => {
    it('should apply without errors', () => {
      assert.deepEqual(actualApply, [null]);
    });
  });
});
