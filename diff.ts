import {Pointer} from './pointer' // we only need this for type inference
import {hasOwnProperty, isNonPrimitive, isPlainObject} from './util'

/**
All diff* functions should return a list of operations, often empty.

Each operation should be an object with two to four fields:
* `op`: the name of the operation; one of "add", "remove", "replace", "move",
  "copy", or "test".
* `path`: a JSON pointer string
* `from`: a JSON pointer string
* `value`: a JSON value

The different operations have different arguments.
* "add": [`path`, `value`]
* "remove": [`path`]
* "replace": [`path`, `value`]
* "move": [`from`, `path`]
* "copy": [`from`, `path`]
* "test": [`path`, `value`]

Currently this only really differentiates between Arrays, Objects, and
Everything Else, which is pretty much just what JSON substantially
differentiates between.
*/

export interface AddOperation     { op: 'add',     path: string, value: any    }
export interface RemoveOperation  { op: 'remove',  path: string                }
export interface ReplaceOperation { op: 'replace', path: string, value: any    }
export interface MoveOperation    { op: 'move',    from: string, path: string  }
export interface CopyOperation    { op: 'copy',    from: string, path: string  }
export interface TestOperation    { op: 'test',    path: string, value: any    }

export type Operation = AddOperation |
                        RemoveOperation |
                        ReplaceOperation |
                        MoveOperation |
                        CopyOperation |
                        TestOperation

export function isDestructive({op}: Operation): boolean {
  return op === 'remove' || op === 'replace' || op === 'copy' || op === 'move'
}

export type Diff = (input: any, output: any, ptr: Pointer) => Operation[]
/**
VoidableDiff exists to allow the user to provide a partial diff(...) function,
falling back to the built-in diffAny(...) function if the user-provided function
returns void.
*/
export type VoidableDiff = (input: any, output: any, ptr: Pointer) => Operation[] | void

/**
List the keys in `minuend` that are not in `subtrahend`.

A key is only considered if it is both 1) an own-property (o.hasOwnProperty(k))
of the object, and 2) has a value that is not undefined. This is to match JSON
semantics, where JSON object serialization drops keys with undefined values.

@param minuend Object of interest
@param subtrahend Object of comparison
@returns Array of keys that are in `minuend` but not in `subtrahend`.
*/
export function subtract(minuend: {[index: string]: any}, subtrahend: {[index: string]: any}): string[] {
  const keys: string[] = []
  for (const key in minuend) {
    if (
      hasOwnProperty.call(minuend, key) &&
      minuend[key] !== undefined &&
      !(hasOwnProperty.call(subtrahend, key) && subtrahend[key] !== undefined)
    ) {
      keys.push(key)
    }
  }
  return keys
}

/**
List the keys that shared by all `objects`.

The semantics of what constitutes a "key" is described in {@link subtract}.

@param objects Array of objects to compare
@returns Array of keys that are in ("own-properties" of) every object in `objects`.
*/
export function intersection(objects: ArrayLike<{[index: string]: any}>): string[] {
  const length = objects.length
  // prepare empty counter to keep track of how many objects each key occurred in
  const counter: {[index: string]: number} = {}
  // go through each object and increment the counter for each key in that object
  for (let i = 0; i < length; i++) {
    const object = objects[i]
    for (const key in object) {
      if (hasOwnProperty.call(object, key) && object[key] !== undefined) {
        counter[key] = (counter[key] || 0) + 1
      }
    }
  }
  // now delete all keys from the counter that were not seen in every object
  for (const key in counter) {
    if (counter[key] < length) {
      delete counter[key]
    }
  }
  // finally, extract whatever keys remain in the counter
  return Object.keys(counter)
}

/**
List the keys that shared by all `a` and `b`.

The semantics of what constitutes a "key" is described in {@link subtract}.

@param a First object to compare
@param b Second object to compare
@returns Array of keys that are in ("own-properties" of) `a` and `b`.
*/
function intersection2(a: {[index: string]: any}, b: {[index: string]: any}): string[] {
  const keys: string[] = []
  for (const key in a) {
    if (
      hasOwnProperty.call(a, key) &&
      a[key] !== undefined &&
      hasOwnProperty.call(b, key) &&
      b[key] !== undefined
    ) {
      keys.push(key)
    }
  }
  return keys
}

interface ArrayAdd     { op: 'add',     index: number, value: any }
interface ArrayRemove  { op: 'remove',  index: number }
interface ArrayReplace { op: 'replace', index: number, original: any, value: any }
/** These are not proper Operation objects, but will be converted into
Operation objects eventually. {index} indicates the actual target position,
never 'end-of-array' */
type ArrayOperation = ArrayAdd | ArrayRemove | ArrayReplace
function isArrayAdd(array_operation: ArrayOperation): array_operation is ArrayAdd {
  return array_operation.op === 'add'
}
function isArrayRemove(array_operation: ArrayOperation): array_operation is ArrayRemove {
  return array_operation.op === 'remove'
}

/**
The last move on the cheapest path to a given position in the cost matrix.
These are stored in a Uint8Array, so they must be (small) numbers; as a const
enum, they're compiled to plain number literals.
*/
const enum Move {
  Keep,
  Remove,
  Add,
  Replace,
}

/**
Calculate the shortest sequence of operations to get from `input` to `output`,
using a dynamic programming implementation of the Levenshtein distance algorithm.

To get from the input ABC to the output AZ we could just delete all the input
and say "insert A, insert Z" and be done with it. That's what we do if the
input is empty. But we can be smarter.

          output
               A   Z
               -   -
          [0]  1   2
input A |  1  [0]  1
      B |  2  [1]  1
      C |  3   2  [2]

1) start at 0,0 (+0)
2) keep A (+0)
3) remove B (+1)
4) replace C with Z (+1)

If the `input` (source) is empty, they'll all be in the top row, resulting in an
array of 'add' operations.
If the `output` (target) is empty, everything will be in the left column,
resulting in an array of 'remove' operations.

The common prefix and suffix of `input` and `output` are skipped before filling
in the cost matrix. Keeping equal elements is always optimal, so this doesn't
change the cost, only (potentially) which of several equally cheap sequences of
operations is returned; e.g., [A, A] -> [A] removes the second A, not the first.

@returns A list of add/remove/replace operations.
*/
export function diffArrays<T>(input: T[], output: T[], ptr: Pointer, diff: Diff = diffAny): Operation[] {
  // handle weird objects masquerading as Arrays that don't have proper length
  // properties by using 0 for everything but positive numbers
  const input_length = (isNaN(input.length) || input.length <= 0) ? 0 : input.length
  const output_length = (isNaN(output.length) || output.length <= 0) ? 0 : output.length
  // we only need to know whether two elements are equal, so for the default
  // diff, use the equivalent but much cheaper isEqual (a custom diff might
  // consider elements equal that isEqual wouldn't, so it has to be called)
  const equal = diff === diffAny ?
    (input_index: number, output_index: number) => isEqual(input[input_index], output[output_index]) :
    (input_index: number, output_index: number) => !diff(input[input_index], output[output_index], ptr.add(String(input_index))).length
  // skip the common prefix and suffix
  let start = 0
  while (start < input_length && start < output_length && equal(start, start)) {
    start++
  }
  let input_end = input_length
  let output_end = output_length
  while (input_end > start && output_end > start && equal(input_end - 1, output_end - 1)) {
    input_end--
    output_end--
  }
  // the cost matrix (see layout above) only covers input.slice(start, input_end)
  // and output.slice(start, output_end)
  const rows = input_end - start
  const columns = output_end - start
  // position (i, j) in the cost matrix is stored at index i * width + j
  const width = columns + 1
  // moves[i * width + j] is the last move on the cheapest path to (i, j),
  // i.e., the cheapest way to get from input.slice(start, start + i) to
  // output.slice(start, start + j)
  // (there may be other ways that are just as cheap)
  const moves = new Uint8Array((rows + 1) * width)
  // the total cost of that path (+1 for each add/remove/replace) for each
  // position in the current row; we only need the previous row to compute it
  let previous_costs = new Uint32Array(width)
  let current_costs = new Uint32Array(width)
  // topmost row: add everything
  for (let j = 1; j <= columns; j++) {
    previous_costs[j] = j
    moves[j] = Move.Add
  }
  for (let i = 1; i <= rows; i++) {
    // leftmost column: remove everything
    current_costs[0] = i
    moves[i * width] = Move.Remove
    for (let j = 1; j <= columns; j++) {
      if (equal(start + i - 1, start + j - 1)) {
        // equal (no operations => no cost)
        current_costs[j] = previous_costs[j - 1]
        moves[i * width + j] = Move.Keep
      }
      else {
        // the meat of the algorithm: take the cheapest alternative, where ties
        // go to (in order of preference) remove, add, replace
        let cost = previous_costs[j] + 1
        let move = Move.Remove
        const add_cost = current_costs[j - 1] + 1
        if (add_cost < cost) {
          cost = add_cost
          move = Move.Add
        }
        // the general plan is to replace it, but we can be smarter, recursing
        // into the structure and replacing only part of it if possible
        // (which is handled when converting to proper Operations below)
        const replace_cost = previous_costs[j - 1] + 1
        if (replace_cost < cost) {
          cost = replace_cost
          move = Move.Replace
        }
        current_costs[j] = cost
        moves[i * width + j] = move
      }
    }
    // this row becomes the previous row for the next one, and we reuse the old
    // previous row's buffer for the next row (every cell gets overwritten)
    [previous_costs, current_costs] = [current_costs, previous_costs]
  }
  // trace back from the bottom-right corner to collect the operations
  const array_operations: ArrayOperation[] = []
  for (let i = rows, j = columns; i > 0 || j > 0;) {
    // the index in `input` of the element at row i
    const index = start + i - 1
    switch (moves[i * width + j]) {
      case Move.Keep:
        i--
        j--
        break
      case Move.Remove:
        array_operations.push({op: 'remove', index})
        i--
        break
      case Move.Add:
        array_operations.push({op: 'add', index, value: output[start + j - 1]})
        j--
        break
      case Move.Replace:
        array_operations.push({op: 'replace', index, original: input[index], value: output[start + j - 1]})
        i--
        j--
        break
    }
  }
  array_operations.reverse()
  // convert array_operations into proper Operations, keeping track of how much
  // earlier adds and removes have shifted the indices of later elements
  const operations: Operation[] = []
  let padding = 0
  for (const array_operation of array_operations) {
    if (isArrayAdd(array_operation)) {
      const padded_index = array_operation.index + 1 + padding
      const index_token = padded_index < (input_length + padding) ? String(padded_index) : '-'
      operations.push({
        op: array_operation.op,
        path: ptr.add(index_token).toString(),
        value: array_operation.value,
      })
      padding++
    }
    else if (isArrayRemove(array_operation)) {
      operations.push({
        op: array_operation.op,
        path: ptr.add(String(array_operation.index + padding)).toString(),
      })
      padding--
    }
    else { // replace
      const replace_ptr = ptr.add(String(array_operation.index + padding))
      // push one at a time, since spreading a huge sub-diff could exceed the maximum number of arguments
      for (const operation of diff(array_operation.original, array_operation.value, replace_ptr)) {
        operations.push(operation)
      }
    }
  }
  return operations
}

export function diffObjects(input: any, output: any, ptr: Pointer, diff: Diff = diffAny): Operation[] {
  // if a key is in input but not output -> remove it
  const operations: Operation[] = []
  subtract(input, output).forEach(key => {
    operations.push({op: 'remove', path: ptr.add(key).toString()})
  })
  // if a key is in output but not input -> add it
  subtract(output, input).forEach(key => {
    operations.push({op: 'add', path: ptr.add(key).toString(), value: output[key]})
  })
  // if a key is in both, diff it recursively
  intersection2(input, output).forEach(key => {
    operations.push(...diff(input[key], output[key], ptr.add(key)))
  })
  return operations
}

/**
Compare two non-plain objects (see {@link isPlainObject}) as atomic values,
which are either equal or must be replaced wholesale.

`Date`s are equal if they represent the same time, and `Map`s and `Set`s are
equal if their entries are (as determined by `equal`). Any other non-plain
objects (e.g., `RegExp`s or typed arrays) are only equal if they're identical,
which has already been ruled out by the time this is called.
*/
function equalAtomic(input: object, output: object, equal: (input: any, output: any) => boolean): boolean {
  if (input instanceof Date && output instanceof Date) {
    // Object.is treats two invalid dates (NaN) as equal
    return Object.is(input.getTime(), output.getTime())
  }
  if (input instanceof Map && output instanceof Map) {
    if (input.size !== output.size) {
      return false
    }
    for (const [key, value] of input) {
      if (!output.has(key) || !equal(value, output.get(key))) {
        return false
      }
    }
    return true
  }
  if (input instanceof Set && output instanceof Set) {
    if (input.size !== output.size) {
      return false
    }
    // match each input element to a distinct output element, trying identity first
    const unmatched = new Set(output)
    for (const value of input) {
      if (unmatched.has(value)) {
        unmatched.delete(value)
        continue
      }
      let match_found = false
      for (const candidate of unmatched) {
        if (equal(value, candidate)) {
          unmatched.delete(candidate)
          match_found = true
          break
        }
      }
      if (!match_found) {
        return false
      }
    }
    return true
  }
  return false
}

/**
Determine whether `input` and `output` are equal by the same standard as
{@link diffAny}, i.e., whether `diffAny(input, output, ptr)` would return an
empty array, but without building any operations (or pointers) along the way.
*/
export function isEqual(input: any, output: any): boolean {
  if (input === output) {
    return true
  }
  if (Array.isArray(input) && Array.isArray(output)) {
    if (input.length !== output.length) {
      return false
    }
    for (let i = 0; i < input.length; i++) {
      if (!isEqual(input[i], output[i])) {
        return false
      }
    }
    return true
  }
  if (isPlainObject(input) && isPlainObject(output)) {
    // keys are own properties whose values are not undefined, as in subtract / intersection2
    for (const key in input) {
      if (hasOwnProperty.call(input, key) && input[key] !== undefined) {
        if (!(hasOwnProperty.call(output, key) && output[key] !== undefined) || !isEqual(input[key], output[key])) {
          return false
        }
      }
    }
    for (const key in output) {
      if (hasOwnProperty.call(output, key) && output[key] !== undefined &&
          !(hasOwnProperty.call(input, key) && input[key] !== undefined)) {
        return false
      }
    }
    return true
  }
  if (isNonPrimitive(input) && isNonPrimitive(output)) {
    return equalAtomic(input, output, isEqual)
  }
  // diffAny would replace `input` with `output` wholesale
  return false
}

/**
`diffAny()` returns an empty array if `input` and `output` are materially equal
(i.e., would produce equivalent JSON); otherwise it produces an array of patches
that would transform `input` into `output`.

> Here, "equal" means that the value at the target location and the
> value conveyed by "value" are of the same JSON type, and that they
> are considered equal by the following rules for that type:
> o  strings: are considered equal if they contain the same number of
>    Unicode characters and their code points are byte-by-byte equal.
> o  numbers: are considered equal if their values are numerically
>    equal.
> o  arrays: are considered equal if they contain the same number of
>    values, and if each value can be considered equal to the value at
>    the corresponding position in the other array, using this list of
>    type-specific rules.
> o  objects: are considered equal if they contain the same number of
>    members, and if each member can be considered equal to a member in
>    the other object, by comparing their keys (as strings) and their
>    values (using this list of type-specific rules).
> o  literals (false, true, and null): are considered equal if they are
>    the same.
*/
export function diffAny(input: any, output: any, ptr: Pointer, diff: Diff = diffAny): Operation[] {
  // strict equality handles literals, numbers, and strings (a sufficient but not necessary cause)
  if (input === output) {
    return []
  }
  if (Array.isArray(input) && Array.isArray(output)) {
    return diffArrays(input, output, ptr, diff)
  }
  if (isPlainObject(input) && isPlainObject(output)) {
    return diffObjects(input, output, ptr, diff)
  }
  if (isNonPrimitive(input) && isNonPrimitive(output) && equalAtomic(input, output, (a, b) => !diff(a, b, ptr).length)) {
    return []
  }
  // at this point we know that input and output are materially different;
  // could be array -> object, object -> array, boolean -> undefined,
  // number -> string, Date -> Date, or some other combination,
  // but nothing that can be split up into multiple patches:
  // so `output` must replace `input` wholesale.
  return [{op: 'replace', path: ptr.toString(), value: output}]
}
