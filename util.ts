export const hasOwnProperty = Object.prototype.hasOwnProperty

/**
Check whether `value` is an object whose contents are its own properties,
so that it can be compared field by field.

This is true for object literals, `JSON.parse` output, `Object.create(null)`,
and instances of ordinary classes, but false for arrays and for built-ins whose
state lives in internal slots (`Date`, `Map`, `Set`, `RegExp`, typed arrays,
boxed primitives, etc.). Unlike `instanceof` or prototype checks, it works for
objects from other realms (iframes, `vm` contexts).
*/
export function isPlainObject(value: any): value is {[index: string]: any} {
  return Object.prototype.toString.call(value) === '[object Object]'
}

export function isNonPrimitive(value: any): value is {[index: string]: any} {
  // loose-equality checking for null is faster than strict checking for each of null/undefined/true/false
  // checking null first, then calling typeof, is faster than vice-versa
  return value != null && typeof value == 'object'
}

/**
Recursively copy a value.

@param source - should be a JavaScript primitive, Array, Date, Map, Set, or (plain old) Object.
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
  // Date
  if (source.constructor == Date) {
    const dateTarget: any = new Date(+source)
    return dateTarget
  }
  // Map (keys are not cloned, since they're compared by identity)
  if (source.constructor == Map) {
    const mapTarget: any = new Map()
    for (const [key, value] of source as Map<any, any>) {
      mapTarget.set(key, clone(value))
    }
    return mapTarget
  }
  // Set
  if (source.constructor == Set) {
    const setTarget: any = new Set()
    for (const value of source as Set<any>) {
      setTarget.add(clone(value))
    }
    return setTarget
  }
  // Object
  const objectTarget: any = {}
  // declaring the variable (with const) inside the loop is faster
  for (const key in source) {
    // hasOwnProperty costs a bit of performance, but it's semantically necessary
    // using a global helper is MUCH faster than calling source.hasOwnProperty(key)
    // assigning to '__proto__' would replace objectTarget's prototype (prototype pollution)
    if (hasOwnProperty.call(source, key) && key != '__proto__') {
      objectTarget[key] = clone(source[key])
    }
  }
  return objectTarget
}
