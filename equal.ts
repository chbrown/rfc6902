const hasOwnProperty = Object.prototype.hasOwnProperty

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

/**
Evaluate `left === right`, treating `left` and `right` as ordered lists.

@returns true iff `left` and `right` have identical lengths, and every element
         of `left` is equal to the corresponding element of `right`. Equality is
         determined recursivly, via `compare`.
*/
function compareArrays(left: ArrayLike<any>, right: ArrayLike<any>): boolean {
  const length = left.length
  if (length !== right.length) {
    return false
  }
  for (let i = 0; i < length; i++) {
    if (!compare(left[i], right[i])) {
      return false
    }
  }
  return true
}

/**
Evaluate `left === right`, treating `left` and `right` as property maps.

@returns true iff every property in `left` has a value equal to the value of the
         corresponding property in `right`, and vice-versa, stopping as soon as
         possible. Equality is determined recursivly, via `compare`.
*/
function compareObjects(left: object, right: object): boolean {
  const left_keys = Object.keys(left)
  const right_keys = Object.keys(right)
  const length = left_keys.length
  // quick exit if the number of keys don't match up
  if (length !== right_keys.length) {
    return false
  }
  // we don't know for sure that Set(left_keys) is equal to Set(right_keys),
  // much less that their values in left and right are equal, but if right
  // contains each key in left, we know it can't have any additional keys
  for (let i = 0; i < length; i++) {
    const key = left_keys[i]
    if (!hasOwnProperty.call(right, key) || !compare(left[key], right[key])) {
      return false
    }
  }
  return true
}

/**
`compare()` returns true if `left` and `right` are materially equal
(i.e., would produce equivalent JSON), false otherwise.

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
export function compare(left: any, right: any): boolean {
  // strict equality handles literals, numbers, and strings (a sufficient but not necessary cause)
  if (left === right) {
    return true
  }
  const left_type = objectType(left)
  const right_type = objectType(right)
  // check arrays
  if (left_type == 'array' && right_type == 'array') {
    return compareArrays(left, right)
  }
  // check objects
  if (left_type == 'object' && right_type == 'object') {
    return compareObjects(left, right)
  }
  // mismatched arrays & objects, etc., are always inequal
  return false
}
