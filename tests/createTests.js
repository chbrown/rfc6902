import assert from 'assert';
import {describe, it} from 'mocha';

import {createTests} from '../index';

describe('createTests for simple patch:', () => {
  // > For example, given the JSON document
  var obj = { "itemCodes": [ "123", "456", "789" ] };

  // > and the following patch
  var patch = [ {op: 'remove', path: '/itemCodes/1'} ];

  // > should generate the following test
  var expected = [ {op: 'test', from: '', path: '/itemCodes/1', value: "456"} ];

  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate to expected test', () => {
      var actual = createTests(obj, patch);
      assert.deepEqual(actual, expected);
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

  describe(`patch "${JSON.stringify(patch)}"`, () => {
    it('should generate to expected test', () => {
      var actual = createTests(obj, patch);
      assert.deepEqual(actual, expected);
    });
  });
});
