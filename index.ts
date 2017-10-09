import {InvalidOperationError} from './errors'
import {Pointer} from './pointer'

import * as operationFunctions from './patch'
import {Operation, diffAny, isDestructive, TestOperation} from './diff'

/**
Apply a 'application/json-patch+json'-type patch to an object.

`patch` *must* be an array of operations.

> Operation objects MUST have exactly one "op" member, whose value
> indicates the operation to perform.  Its value MUST be one of "add",
> "remove", "replace", "move", "copy", or "test"; other values are
> errors.

This method currently operates on the target object in-place.

Returns list of results, one for each operation.
  - `null` indicated success.
  - otherwise, the result will be an instance of one of the Error classe
    defined in errors.js.
*/
export function applyPatch(object, patch) {
  return patch.map(operation => {
    const operationFunction = operationFunctions[operation.op]
    // speedy exit if we don't recognize the operation name
    if (operationFunction === undefined) {
      return new InvalidOperationError(operation.op)
    }
    return operationFunction(object, operation)
  })
}

/**
Produce a 'application/json-patch+json'-type patch to get from one object to
another.

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of operations to perform on `input` to produce `output`.
*/
export function createPatch(input, output): Operation[] {
  const ptr = new Pointer()
  // a new Pointer gets a default path of [''] if not specified
  return diffAny(input, output, ptr)
}

function createTest(input: any, path: string): TestOperation {
  const endpoint = Pointer.fromJSON(path).evaluate(input)
  if (endpoint !== undefined) {
    return {op: 'test', path, value: endpoint.value}
  }
}

/**
Produce an 'application/json-patch+json'-type list of tests, to verify that
existing values in an object are identical to the those captured at some
checkpoint (whenever this function is called).

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of test operations.
*/
export function createTests(input: any, patch: Operation[]): TestOperation[] {
  const tests = new Array<TestOperation>()
  patch.filter(isDestructive).forEach(operation => {
    const pathTest = createTest(input, operation.path)
    if (pathTest) tests.push(pathTest)
    if ('from' in operation) {
      const fromTest = createTest(input, operation['from'])
      if (fromTest) tests.push(fromTest)
    }
  })
  return tests
}
