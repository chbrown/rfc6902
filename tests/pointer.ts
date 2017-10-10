import * as assert from 'assert'
import 'mocha'

import {Pointer} from '../pointer'

function clone(object) {
  return JSON.parse(JSON.stringify(object))
}

describe('Pointer#get', () => {
  var input = {bool: false, arr: ['10', '20', '30'], obj: {a: 'A', b: 'B'}}
  it('should get bool value', () => {
    assert.equal(Pointer.fromJSON('/bool').get(input), false)
  })
  it('should get array value', () => {
    assert.equal(Pointer.fromJSON('/arr/1').get(input), 20)
  })
  it('should get object value', () => {
    assert.equal(Pointer.fromJSON('/obj/b').get(input), 'B')
  })
})

describe('Pointer#set', () => {
  var original = {bool: true, arr: ['10', '20', '30'], obj: {a: 'A', b: 'B'}}
  it('should set bool value in-place', () => {
    var input = clone(original)
    Pointer.fromJSON('/bool').set(input, false)
    assert.equal(input.bool, false)
  })
  it('should set array value in-place', () => {
    var input = clone(original)
    Pointer.fromJSON('/arr/1').set(input, 0)
    assert.equal(input.arr[1], 0)
  })
  it('should set array value in-place', () => {
    var input = clone(original)
    Pointer.fromJSON('/arr/3').set(input, 40)
    assert.equal(input.arr[3], 40)
  })
  it('should set object value in-place', () => {
    var input = clone(original)
    Pointer.fromJSON('/obj/b').set(input, 'BBB')
    assert.equal(input.obj.b, 'BBB')
  })
  it('should add object value in-place', () => {
    var input = clone(original)
    Pointer.fromJSON('/obj/c').set(input, 'C')
    assert.equal(input.obj.c, 'C')
  })
})
