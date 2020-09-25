export const hasOwnProperty = Object.prototype.hasOwnProperty

export function objectType(object: any) {
  if (object === undefined) {
    return 'undefined'
  }
  if (object === null) {
    return 'null'
  }
  if (Array.isArray(object)) {
    return 'array'
  }
  return typeof object
}

function isNonPrimitive(value: any): value is object {
  // loose-equality checking for null is faster than strict checking for each of null/undefined/true/false
  // checking null first, then calling typeof, is faster than vice-versa
  return value != null && typeof value == 'object'
}

/**
Recursively copy a value.

@param source - should be a JavaScript primitive, Array, or (plain old) Object.
@returns copy of source where every Array and Object have been recursively
         reconstructed from their constituent elements
*/
export function clone<T extends any>(source: T): T {
  if (!isNonPrimitive(source)) {
    // short-circuiting is faster than a single return
    return source
  }
  // x.constructor == Array is the fastest way to check if x is an Array
  if (source.constructor == Array) {
    // construction via imperative for-loop is faster than source.map(arrayVsObject)
    const length = (source as Array<any>).length
    // setting the Array length during construction is faster than just `[]` or `new Array()`
    const arrayTarget: any = new Array(length)
    for (let i = 0; i < length; i++) {
      arrayTarget[i] = clone(source[i])
    }
    return arrayTarget
  }
  // Object
  const objectTarget: any = {}
  // declaring the variable (with const) inside the loop is faster
  for (const key in source) {
    // hasOwnProperty costs a bit of performance, but it's semantically necessary
    // using a global helper is MUCH faster than calling source.hasOwnProperty(key)
    if (hasOwnProperty.call(source, key)) {
      objectTarget[key] = clone(source[key])
    }
  }
  return objectTarget
}
