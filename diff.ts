import {compare} from './equal';
import {Pointer} from './pointer'; // we only need this for type inference

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

interface AddOperation { op: 'add', path: string, value: string }
interface RemoveOperation { op: 'remove', path: string }
interface ReplaceOperation { op: 'replace', path: string, value: string }
interface MoveOperation { op: 'move', from: string, path: string }
interface CopyOperation { op: 'copy', from: string, path: string }
interface TestOperation { op: 'test', from: string, path: string }

type Operation = AddOperation |
                 RemoveOperation |
                 ReplaceOperation |
                 MoveOperation |
                 CopyOperation |
                 TestOperation;

/**
subtract(a, b) returns the keys in `a` that are not in `b`.
*/
function subtract<A, B>(a: A, b: B): string[] {
  const obj: {[index: string]: number} = {};
  for (let add_key in a) {
    obj[add_key] = 1;
  }
  for (let del_key in b) {
    delete obj[del_key];
  }
  return Object.keys(obj);
}

/**
intersection(objects) returns the keys that shared by all given `objects`.
*/
function intersection<T>(objects: T[]): string[] {
  // initialize like union()
  const key_counts: {[index: string]: number} = {};
  objects.forEach(object => {
    for (let key in object) {
      key_counts[key] = (key_counts[key] || 0) + 1;
    }
  });
  // but then, extra requirement: delete less commonly-seen keys
  const threshold = objects.length;
  for (let key in key_counts) {
    if (key_counts[key] < threshold) {
      delete key_counts[key];
    }
  }
  return Object.keys(key_counts);
}

function objectType(object: any): string {
  if (object === undefined) {
    return 'undefined';
  }
  if (object === null) {
    return 'null';
  }
  if (Array.isArray(object)) {
    return 'array';
  }
  return typeof object;
}

interface ArrayAdd { op: 'add', index: number, value: any }
interface ArrayRemove { op: 'remove', index: number }
interface ArrayReplace { op: 'replace', index: number, original: any, value: any }
/** These are not proper Operation objects, but will be converted into
Operation objects eventually. {index} indicates the actual target position,
never 'end-of-array' */
type ArrayOperation = ArrayAdd | ArrayRemove | ArrayReplace;
function isArrayAdd(array_operation: ArrayOperation): array_operation is ArrayAdd {
  return array_operation.op === 'add';
}
function isArrayRemove(array_operation: ArrayOperation): array_operation is ArrayRemove {
  return array_operation.op === 'remove';
}
function isArrayReplace(array_operation: ArrayOperation): array_operation is ArrayReplace {
  return array_operation.op === 'replace';
}

interface DynamicAlternative {
  operations: ArrayOperation[];
  /**
  cost indicates the total cost of getting to this position.
  */
  cost: number;
}

/**
Array-diffing smarter (levenshtein-like) diffing here

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

if input (source) is empty, they'll all be in the top row, just a bunch of
additions. If the output is empty, everything will be in the left column, as a
bunch of deletions.
*/
function diffArrays<T>(input: T[], output: T[], ptr: Pointer): Operation[] {
  // set up cost matrix (very simple initialization: just a map)
  const memo: {[index: string]: DynamicAlternative} = {
    '0,0': {operations: [], cost: 0}
  };
  /**
  input[i's] -> output[j's]

  Given the layout above, i is the row, j is the col

  returns a list of Operations needed to get to from input.slice(0, i) to
  output.slice(0, j), the each marked with the total cost of getting there.
  `cost` is a non-negative integer.
  Recursive.
  */
  function dist(i: number, j: number): DynamicAlternative {
    // memoized
    let memoized = memo[i+','+j];
    if (memoized === undefined) {
      if (compare(input[i - 1], output[j - 1])) {
        // equal (no operations => no cost)
        memoized = dist(i - 1, j - 1);
      }
      else {
        const alternatives: DynamicAlternative[] = [];
        if (i > 0) {
          // NOT topmost row
          const remove_alternative = dist(i - 1, j);
          alternatives.push({
            // the new operation must be pushed on the end
            operations: remove_alternative.operations.concat({
              op: 'remove',
              index: i - 1,
            }),
            cost: remove_alternative.cost + 1,
          });
        }
        if (j > 0) {
          // NOT leftmost column
          const add_alternative = dist(i, j - 1);
          alternatives.push({
            operations: add_alternative.operations.concat({
              op: 'add',
              index: i - 1,
              value: output[j - 1],
            }),
            cost: add_alternative.cost + 1,
          });
        }
        if (i > 0 && j > 0) {
          // TABLE MIDDLE
          // supposing we replaced it, compute the rest of the costs:
          const replace_alternative = dist(i - 1, j - 1);
          // okay, the general plan is to replace it, but we can be smarter,
          // recursing into the structure and replacing only part of it if
          // possible, but to do so we'll need the original value
          alternatives.push({
            operations: replace_alternative.operations.concat({
              op: 'replace',
              index: i - 1,
              original: input[i - 1],
              value: output[j - 1],
            }),
            cost: replace_alternative.cost + 1,
          });
        }
        // the only other case, i === 0 && j === 0, has already been memoized

        // the meat of the algorithm:
        // sort by cost to find the lowest one (might be several ties for lowest)
        // [4, 6, 7, 1, 2].sort(function(a, b) {return a - b;}); -> [ 1, 2, 4, 6, 7 ]
        const best = alternatives.sort((a, b) => a.cost - b.cost)[0];
        memoized = best;
      }
      memo[i+','+j] = memoized;
    }
    return memoized;
  }
  const array_operations = dist(input.length, output.length).operations;
  const [operations, padding] = array_operations.reduce<[Operation[], number]>(([operations, padding], array_operation) => {
    if (isArrayAdd(array_operation)) {
      const padded_index = array_operation.index + 1 + padding;
      const index_token = padded_index < input.length ? String(padded_index) : '-';
      const operation = {
        op: array_operation.op,
        path: ptr.add(index_token).toString(),
        value: array_operation.value,
      };
      // padding++; // maybe only if array_operation.index > -1 ?
      return [operations.concat(operation), padding + 1];
    }
    else if (isArrayRemove(array_operation)) {
      const operation = {
        op: array_operation.op,
        path: ptr.add(String(array_operation.index + padding)).toString(),
      }
      // padding--;
      return [operations.concat(operation), padding - 1];
    }
    else { // replace
      const replace_ptr = ptr.add(String(array_operation.index + padding));
      const replace_operations = diffAny(array_operation.original, array_operation.value, replace_ptr);
      return [operations.concat(...replace_operations), padding];
    }
  }, [[], 0]);
  return operations;
}

function diffObjects(input: any, output: any, ptr: Pointer): Operation[] {
  // if a key is in input but not output -> remove it
  const operations: Operation[] = [];
  subtract(input, output).forEach(key => {
    operations.push({op: 'remove', path: ptr.add(key).toString()});
  });
  // if a key is in output but not input -> add it
  subtract(output, input).forEach(key => {
    operations.push({op: 'add', path: ptr.add(key).toString(), value: output[key]});
  });
  // if a key is in both, diff it recursively
  intersection([input, output]).forEach(key => {
    operations.push(...diffAny(input[key], output[key], ptr.add(key)));
  });
  return operations;
}

function diffValues(input: any, output: any, ptr: Pointer): Operation[] {
  if (!compare(input, output)) {
    return [{op: 'replace', path: ptr.toString(), value: output}];
  }
  return [];
}

export function diffAny(input: any, output: any, ptr: Pointer): Operation[] {
  const input_type = objectType(input);
  const output_type = objectType(output);
  if (input_type == 'array' && output_type == 'array') {
    return diffArrays(input, output, ptr);
  }
  if (input_type == 'object' && output_type == 'object') {
    return diffObjects(input, output, ptr);
  }
  // only pairs of arrays and objects can go down a path to produce a smaller
  // diff; everything else must be wholesale replaced if inequal
  return diffValues(input, output, ptr);
}
