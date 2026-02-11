import {Pointer} from './pointer'
import {objectType, clone} from './util'
import {AddOperation,
        RemoveOperation,
        ReplaceOperation,
        MoveOperation,
        CopyOperation,
        TestOperation,
        Operation,
        diffAny} from './diff'

export interface Options {
  /**
  When true, "add" operations with path ending in "/-" will implicitly
  create an empty array where possible.

  For example, with this option enabled, for the object `{live: true}`,
  the operation `add "/tag/-" 123` will result in `{live: true, tag: [123]}`.
  Subsequent operations behave normally: another `add "/tag/-" 456` will result
  in `{live: true, tag: [123, 456]}`.

  If the indicated array property already exists but is not an array, this will
  produce an error.

  Only the leaf array will be inferred; missing parent objects will still
  produce errors.
  */
  implicitArrayCreation?: boolean
}

export class MissingError extends Error {
  constructor(public path: string) {
    super(`Value required at path: ${path}`)
    this.name = 'MissingError'
  }
}

export class TestError extends Error {
  constructor(public actual: any, public expected: any) {
    super(`Test failed: ${actual} != ${expected}`)
    this.name = 'TestError'
  }
}

function _add(object: any, key: string, value: any): void {
  if (Array.isArray(object)) {
    // `key` must be an index
    if (key == '-') {
      object.push(value)
    }
    else {
      const index = parseInt(key, 10)
      object.splice(index, 0, value)
    }
  }
  else {
    object[key] = value
  }
}

function _remove(object: any, key: string): void {
  if (Array.isArray(object)) {
    // '-' syntax doesn't make sense when removing
    const index = parseInt(key, 10)
    object.splice(index, 1)
  }
  else {
    // not sure what the proper behavior is when path = ''
    delete object[key]
  }
}

/**
>  o  If the target location specifies an array index, a new value is
>     inserted into the array at the specified index.
>  o  If the target location specifies an object member that does not
>     already exist, a new member is added to the object.
>  o  If the target location specifies an object member that does exist,
>     that member's value is replaced.
*/
export function add(object: any, operation: AddOperation, options?: Options): MissingError | null {
  const pointer = Pointer.fromJSON(operation.path)
  // Handle implicit array creation for terminal "/-" paths
  if (options?.implicitArrayCreation && pointer.tokens[pointer.tokens.length - 1] === '-') {
    // Try to evaluate the parent (the array itself)
    const parentEndpoint = pointer.parent().evaluate(object)
    // If the array property doesn't exist but its parent does,
    // and this parent is a plain object (not an array),
    // create an (empty) array that we will add to below.
    if (parentEndpoint.value === undefined && objectType(parentEndpoint.parent) === 'object') {
      parentEndpoint.parent[parentEndpoint.key] = []
    }
  }

  const endpoint = pointer.evaluate(object)
  // it's not exactly a "MissingError" in the same way that `remove` is -- more like a MissingParent, or something
  if (endpoint.parent === undefined) {
    return new MissingError(operation.path)
  }

  // When using implicitArrayCreation, validate that "/-" targets are actually arrays
  if (options?.implicitArrayCreation && endpoint.key === '-' && !Array.isArray(endpoint.parent)) {
    return new MissingError(operation.path)
  }

  _add(endpoint.parent, endpoint.key, clone(operation.value))
  return null
}

/**
> The "remove" operation removes the value at the target location.
> The target location MUST exist for the operation to be successful.
*/
export function remove(object: any, operation: RemoveOperation, options?: Options): MissingError | null {
  // endpoint has parent, key, and value properties
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object)
  if (endpoint.value === undefined) {
    return new MissingError(operation.path)
  }
  // not sure what the proper behavior is when path = ''
  _remove(endpoint.parent, endpoint.key)
  return null
}

/**
> The "replace" operation replaces the value at the target location
> with a new value.  The operation object MUST contain a "value" member
> whose content specifies the replacement value.
> The target location MUST exist for the operation to be successful.

> This operation is functionally identical to a "remove" operation for
> a value, followed immediately by an "add" operation at the same
> location with the replacement value.

Even more simply, it's like the add operation with an existence check.
*/
export function replace(object: any, operation: ReplaceOperation, options?: Options): MissingError | null {
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object)
  if (endpoint.parent === null) {
    return new MissingError(operation.path)
  }
  // this existence check treats arrays as a special case
  if (Array.isArray(endpoint.parent)) {
    if (parseInt(endpoint.key, 10) >= endpoint.parent.length) {
      return new MissingError(operation.path)
    }
  }
  else if (endpoint.value === undefined) {
    return new MissingError(operation.path)
  }
  endpoint.parent[endpoint.key] = clone(operation.value)
  return null
}

/**
> The "move" operation removes the value at a specified location and
> adds it to the target location.
> The operation object MUST contain a "from" member, which is a string
> containing a JSON Pointer value that references the location in the
> target document to move the value from.
> This operation is functionally identical to a "remove" operation on
> the "from" location, followed immediately by an "add" operation at
> the target location with the value that was just removed.

> The "from" location MUST NOT be a proper prefix of the "path"
> location; i.e., a location cannot be moved into one of its children.

TODO: throw if the check described in the previous paragraph fails.
*/
export function move(object: any, operation: MoveOperation, options?: Options): MissingError | null {
  const from_endpoint = Pointer.fromJSON(operation.from).evaluate(object)
  if (from_endpoint.value === undefined) {
    return new MissingError(operation.from)
  }
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object)
  if (endpoint.parent === undefined) {
    return new MissingError(operation.path)
  }
  _remove(from_endpoint.parent, from_endpoint.key)
  _add(endpoint.parent, endpoint.key, from_endpoint.value)
  return null
}

/**
> The "copy" operation copies the value at a specified location to the
> target location.
> The operation object MUST contain a "from" member, which is a string
> containing a JSON Pointer value that references the location in the
> target document to copy the value from.
> The "from" location MUST exist for the operation to be successful.

> This operation is functionally identical to an "add" operation at the
> target location using the value specified in the "from" member.

Alternatively, it's like 'move' without the 'remove'.
*/
export function copy(object: any, operation: CopyOperation, options?: Options): MissingError | null {
  const from_endpoint = Pointer.fromJSON(operation.from).evaluate(object)
  if (from_endpoint.value === undefined) {
    return new MissingError(operation.from)
  }
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object)
  if (endpoint.parent === undefined) {
    return new MissingError(operation.path)
  }
  _add(endpoint.parent, endpoint.key, clone(from_endpoint.value))
  return null
}

/**
> The "test" operation tests that a value at the target location is
> equal to a specified value.
> The operation object MUST contain a "value" member that conveys the
> value to be compared to the target location's value.
> The target location MUST be equal to the "value" value for the
> operation to be considered successful.
*/
export function test(object: any, operation: TestOperation, options?: Options): TestError | null {
  const endpoint = Pointer.fromJSON(operation.path).evaluate(object)
  // TODO: this diffAny(...).length usage could/should be lazy
  if (diffAny(endpoint.value, operation.value, new Pointer()).length) {
    return new TestError(endpoint.value, operation.value)
  }
  return null
}

export class InvalidOperationError extends Error {
  constructor(public operation: Operation) {
    super(`Invalid operation: ${operation.op}`)
    this.name = 'InvalidOperationError'
  }
}

/**
Switch on `operation.op`, applying the corresponding patch function for each
case to `object`.
*/
export function apply(object: any, operation: Operation, options?: Options): MissingError | InvalidOperationError | TestError | null {
  // not sure why TypeScript can't infer typesafety of:
  //   {add, remove, replace, move, copy, test}[operation.op](object, operation)
  // (seems like a bug)
  switch (operation.op) {
    case 'add':     return add(object, operation, options)
    case 'remove':  return remove(object, operation, options)
    case 'replace': return replace(object, operation, options)
    case 'move':    return move(object, operation, options)
    case 'copy':    return copy(object, operation, options)
    case 'test':    return test(object, operation, options)
  }
  return new InvalidOperationError(operation)
}
