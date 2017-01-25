import {InvalidOperationError} from './errors';
import {Pointer} from './pointer';

import * as operationFunctions from './patch';
import {Operation, diffAny} from './diff';

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
    const operationFunction = operationFunctions[operation.op];
    // speedy exit if we don't recognize the operation name
    if (operationFunction === undefined) {
      return new InvalidOperationError(operation.op);
    }
    return operationFunction(object, operation);
  });
}

/**
Produce a 'application/json-patch+json'-type patch to get from one object to
another.

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of operations to perform on `input` to produce `output`.
*/
export function createPatch(input, output): Operation[] {
  const ptr = new Pointer();
  // a new Pointer gets a default path of [''] if not specified
  return diffAny(input, output, ptr);
}

/**
Produce an 'application/json-patch+json'-type patch to test a patch before
working with existing values.

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of test operations to perform on `input` to validate `patch`.
*/
export function createTests(input, patch: Operation[]): Operation[] {
  let tests = new Array<Operation>();

  let patchesToTest = patch.filter(p => p.op === 'remove'
                                     || p.op === 'replace'
                                     || p.op === 'copy'
                                     || p.op === 'move');

  for(let op of patchesToTest) {
    const pointer = new Pointer(op.path.split('/'));
    const pathItem = pointer.evaluate(input);
    if(pathItem){
        tests.push({ op: 'test', from:'', path: op.path, value: pathItem.value });
    }
  }

  return tests;
}
