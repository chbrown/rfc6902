/*jslint esnext: true */
import {InvalidOperationError} from './errors';
import {Pointer} from './pointer';

import * as operationFunctions from './patch';
import {diffAny} from './diff';

import package_json from './package';
export var version = package_json.version;

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
    var operationFunction = operationFunctions[operation.op];
    // speedy exit if we don't recognize the operation name
    if (operationFunction === undefined) {
      return new InvalidOperationError(operation.op);
    }
    return operationFunction(object, operation);
  });
}
export function patch(object, patch) {
  console.error('rfc6902.patch(object, patch) has been deprecated. Use rfc6902.applyPatch(object, patch) instead.');
  return applyPatch(object, patch);
}

/**
Produce a 'application/json-patch+json'-type patch to get from one object to
another.

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of operations to perform on `input` to produce `output`.
*/
export function createPatch(input, output) {
  var ptr = new Pointer();
  // a new Pointer gets a default path of [''] if not specified
  var operations = diffAny(input, output, ptr);
  operations.forEach(function(operation) {
    operation.path = operation.path.toString();
  });
  return operations;
}
export function diff(input, output) {
  console.error('rfc6902.diff(input, output) has been deprecated. Use rfc6902.createPatch(input, output) instead.');
  return createPatch(input, output);
}
