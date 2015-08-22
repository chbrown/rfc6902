/**
zip(a, b) assumes that a.length === b.length.
*/
function zip(a, b) {
    var zipped = [];
    for (var i = 0, l = a.length; i < l; i++) {
        zipped.push([a[i], b[i]]);
    }
    return zipped;
}
/**
compareArrays(left, right) assumes that `left` and `right` are both Arrays.
*/
function compareArrays(left, right) {
    if (left.length !== right.length)
        return false;
    return zip(left, right).every(pair => compare(pair[0], pair[1]));
}
/**
compareObjects(left, right) assumes that `left` and `right` are both Objects.
*/
function compareObjects(left, right) {
    var left_keys = Object.keys(left);
    var right_keys = Object.keys(right);
    if (!compareArrays(left_keys, right_keys))
        return false;
    return left_keys.every(key => compare(left[key], right[key]));
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
export function compare(left, right) {
    // strict equality handles literals, numbers, and strings (a sufficient but not necessary cause)
    if (left === right)
        return true;
    // check arrays
    if (Array.isArray(left) && Array.isArray(right)) {
        return compareArrays(left, right);
    }
    // check objects
    if (Object(left) === left && Object(right) === right) {
        return compareObjects(left, right);
    }
    // mismatched arrays & objects, etc., are always inequal
    return false;
}
