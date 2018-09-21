import {compare, objectType} from './equal'
import {Pointer} from './pointer' // we only need this for type inference

const hasOwnProperty = Object.prototype.hasOwnProperty

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
export function subtract(minuend: object, subtrahend: object): string[] {
  // initialize empty object; we only care about the keys, the values can be anything
  const obj: {[index: string]: number} = {}
  // build up obj with all the properties of minuend
  for (const add_key in minuend) {
    if (hasOwnProperty.call(minuend, add_key) && minuend[add_key] !== undefined) {
      obj[add_key] = 1
    }
  }
  // now delete all the properties of subtrahend from obj
  // (deleting a missing key has no effect)
  for (const del_key in subtrahend) {
    if (hasOwnProperty.call(subtrahend, del_key) && subtrahend[del_key] !== undefined) {
      delete obj[del_key]
    }
  }
  // finally, extract whatever keys remain in obj
  return Object.keys(obj)
}

/**
List the keys that shared by all `objects`.

The semantics of what constitutes a "key" is described in {@link subtract}.

@param objects Array of objects to compare
@returns Array of keys that are in ("own-properties" of) every object in `objects`.
*/
export function intersection(objects: ArrayLike<object>): string[] {
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

interface DynamicAlternative {
  operations: ArrayOperation[]
  /**
  cost indicates the total cost of getting to this position.
  */
  cost: number
}

function appendArrayOperation(base: DynamicAlternative, operation: ArrayOperation): DynamicAlternative {
  return {
    // the new operation must be pushed on the end
    operations: base.operations.concat(operation),
    cost: base.cost + 1,
  }
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

@returns A list of add/remove/replace operations.
*/
export function diffArrays<T>(input: T[], output: T[], ptr: Pointer, diff: Diff = diffAny): Operation[] {
  // set up cost matrix (very simple initialization: just a map)
  const memo: {[index: string]: DynamicAlternative} = {
    '0,0': {operations: [], cost: 0},
  }
  /**
  Calculate the cheapest sequence of operations required to get from
  input.slice(0, i) to output.slice(0, j).
  There may be other valid sequences with the same cost, but none cheaper.

  @param i The row in the layout above
  @param j The column in the layout above
  @returns An object containing a list of operations, along with the total cost
           of applying them (+1 for each add/remove/replace operation)
  */
  function dist(i: number, j: number): DynamicAlternative {
    // memoized
    const memo_key = `${i},${j}`
    let memoized = memo[memo_key]
    if (memoized === undefined) {
      if (i > 0 && j > 0 && compare(input[i - 1], output[j - 1])) {
        // equal (no operations => no cost)
        memoized = dist(i - 1, j - 1)
      }
      else {
        const alternatives: DynamicAlternative[] = []
        if (i > 0) {
          // NOT topmost row
          const remove_base = dist(i - 1, j)
          const remove_operation: ArrayRemove = {
            op: 'remove',
            index: i - 1,
          }
          alternatives.push(appendArrayOperation(remove_base, remove_operation))
        }
        if (j > 0) {
          // NOT leftmost column
          const add_base = dist(i, j - 1)
          const add_operation: ArrayAdd = {
            op: 'add',
            index: i - 1,
            value: output[j - 1],
          }
          alternatives.push(appendArrayOperation(add_base, add_operation))
        }
        if (i > 0 && j > 0) {
          // TABLE MIDDLE
          // supposing we replaced it, compute the rest of the costs:
          const replace_base = dist(i - 1, j - 1)
          // okay, the general plan is to replace it, but we can be smarter,
          // recursing into the structure and replacing only part of it if
          // possible, but to do so we'll need the original value
          const replace_operation: ArrayReplace = {
            op: 'replace',
            index: i - 1,
            original: input[i - 1],
            value: output[j - 1],
          }
          alternatives.push(appendArrayOperation(replace_base, replace_operation))
        }
        // the only other case, i === 0 && j === 0, has already been memoized

        // the meat of the algorithm:
        // sort by cost to find the lowest one (might be several ties for lowest)
        // [4, 6, 7, 1, 2].sort((a, b) => a - b) -> [ 1, 2, 4, 6, 7 ]
        const best = alternatives.sort((a, b) => a.cost - b.cost)[0]
        memoized = best
      }
      memo[memo_key] = memoized
    }
    return memoized
  }
  // handle weird objects masquerading as Arrays that don't have proper length
  // properties by using 0 for everything but positive numbers
  const input_length = (isNaN(input.length) || input.length <= 0) ? 0 : input.length
  const output_length = (isNaN(output.length) || output.length <= 0) ? 0 : output.length
  const array_operations = dist(input_length, output_length).operations
  const [padded_operations] = array_operations.reduce<[Operation[], number]>(([operations, padding], array_operation) => {
    if (isArrayAdd(array_operation)) {
      const padded_index = array_operation.index + 1 + padding
      const index_token = padded_index < (input_length + padding) ? String(padded_index) : '-'
      const operation = {
        op: array_operation.op,
        path: ptr.add(index_token).toString(),
        value: array_operation.value,
      }
      // padding++ // maybe only if array_operation.index > -1 ?
      return [operations.concat(operation), padding + 1]
    }
    else if (isArrayRemove(array_operation)) {
      const operation = {
        op: array_operation.op,
        path: ptr.add(String(array_operation.index + padding)).toString(),
      }
      // padding--
      return [operations.concat(operation), padding - 1]
    }
    else { // replace
      const replace_ptr = ptr.add(String(array_operation.index + padding))
      const replace_operations = diff(array_operation.original, array_operation.value, replace_ptr)
      return [operations.concat(...replace_operations), padding]
    }
  }, [[], 0])
  return padded_operations
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
  intersection([input, output]).forEach(key => {
    operations.push(...diff(input[key], output[key], ptr.add(key)))
  })
  return operations
}

export function diffValues(input: any, output: any, ptr: Pointer): Operation[] {
  if (!compare(input, output)) {
    return [{op: 'replace', path: ptr.toString(), value: output}]
  }
  return []
}

export function diffAny(input: any, output: any, ptr: Pointer, diff: Diff = diffAny): Operation[] {
  const input_type = objectType(input)
  const output_type = objectType(output)
  if (input_type == 'array' && output_type == 'array') {
    return diffArrays(input, output, ptr, diff)
  }
  if (input_type == 'object' && output_type == 'object') {
    return diffObjects(input, output, ptr, diff)
  }
  // only pairs of arrays and objects can go down a path to produce a smaller
  // diff; everything else must be wholesale replaced if inequal
  return diffValues(input, output, ptr)
}
