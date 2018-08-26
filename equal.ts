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
  if (!compareArrays(left_keys, right_keys)) {
    return false
  }
  return left_keys.every(key => compare(left[key], right[key]))
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
  // check arrays
  if (Array.isArray(left) && Array.isArray(right)) {
    return compareArrays(left, right)
  }
  // check objects
  if (Object(left) === left && Object(right) === right) {
    return compareObjects(left, right)
  }
  // mismatched arrays & objects, etc., are always inequal
  return false
}
