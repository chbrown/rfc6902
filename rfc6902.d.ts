declare module "rfc6902" {
  interface Operation {
    op: string;
    from?: string;
    path?: string;
    value?: string;
  }
  type Patch = Operation[];
  interface OperationResult extends Error { }
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
  function applyPatch(object: any, patch: Patch): OperationResult[];
  /**
  Produce a 'application/json-patch+json'-type patch to get from one object to
  another.

  This does not alter `input` or `output` unless they have a property getter with
  side-effects (which is not a good idea anyway).

  Returns list of operations to perform on `input` to produce `output`.
  */
  function createPatch(input: any, output: any): Patch;
}
