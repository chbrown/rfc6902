import test from 'ava'

import {Pointer} from '../pointer'

test('Pointer#get', t => {
  const input = {bool: false, arr: [10, 20, 30], obj: {a: 'A', b: 'B'}}
  t.deepEqual(Pointer.fromJSON('/bool').get(input), false, 'should get bool value')
  t.deepEqual(Pointer.fromJSON('/arr/1').get(input), 20, 'should get array value')
  t.deepEqual(Pointer.fromJSON('/obj/b').get(input), 'B', 'should get object value')
})

test('Pointer#set bool', t => {
  const input = {bool: true}
  Pointer.fromJSON('/bool').set(input, false)
  t.deepEqual(input.bool, false, 'should set bool value in-place')
})

test('Pointer#set array middle', t => {
  const input: any = {arr: ['10', '20', '30']}
  Pointer.fromJSON('/arr/1').set(input, 0)
  t.deepEqual(input.arr[1], 0, 'should set array value in-place')
})

test('Pointer#set array beyond', t => {
  const input: any = {arr: ['10', '20', '30']}
  Pointer.fromJSON('/arr/3').set(input, 40)
  t.deepEqual(input.arr[3], 40, 'should set array value in-place')
})

test('Pointer#set object existing', t => {
  const input = {obj: {a: 'A', b: 'B'}}
  Pointer.fromJSON('/obj/b').set(input, 'BBB')
  t.deepEqual(input.obj.b, 'BBB', 'should set object value in-place')
})

test('Pointer#set object new', t => {
  const input: any = {obj: {a: 'A', b: 'B'}}
  Pointer.fromJSON('/obj/c').set(input, 'C')
  t.deepEqual(input.obj.c, 'C', 'should add object value in-place')
})
