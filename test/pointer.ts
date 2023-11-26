import test from 'ava'

import {Pointer} from '../pointer'

test('Pointer.fromJSON empty', t => {
  t.notThrows(() => {
    Pointer.fromJSON('')
  })
})
test('Pointer.fromJSON slash', t => {
  t.notThrows(() => {
    Pointer.fromJSON('/')
  })
})
test('Pointer.fromJSON invalid', t => {
  const error = t.throws(() => {
    Pointer.fromJSON('a')
  })
  t.regex(error.message, /Invalid JSON Pointer/, 'thrown error should have descriptive message')
})

const example = {bool: false, arr: [10, 20, 30], obj: {a: 'A', b: 'B'}}

test('Pointer#get bool', t => {
  t.deepEqual(Pointer.fromJSON('/bool').get(example), false, 'should get bool value')
})
test('Pointer#get array', t => {
  t.deepEqual(Pointer.fromJSON('/arr/1').get(example), 20, 'should get array value')
})
test('Pointer#get object', t => {
  t.deepEqual(Pointer.fromJSON('/obj/b').get(example), 'B', 'should get object value')
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

test('Pointer#set top-level', t => {
  const input: any = {obj: {a: 'A', b: 'B'}}
  const original = clone(input)
  Pointer.fromJSON('').set(input, {other: {c: 'C'}})
  t.deepEqual(input, original, 'should not mutate object for top-level pointer')
  // You might think, well, why? Why shouldn't we do it and then have a test:
  // t.deepEqual(input, {other: {c: 'C'}}, 'should replace whole object')
  // And true, we could hack that by removing the current properties and setting the new ones,
  // but that only works for the case of object-replacing-object;
  // the following is just as valid (though clearly impossible)...
  Pointer.fromJSON('').set(input, 'root')
  t.deepEqual(input, original, 'should not mutate object for top-level pointer')
  // ...and it'd be weird to have it work for one but not the other.
  // See Issue #92 for more discussion of this limitation / behavior.
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
