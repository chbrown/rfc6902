'use strict'; /*jslint node: true, es5: true, indent: 2 */
var pointer = require('./pointer');
var errors = require('./errors');
// var optimist = require('optimist');

var _zip = function(a, b) {
  var zipped = [];
  for (var i = 0, l = Math.min(a.length, b.length); i < l; i++) {
    zipped.push([a[i], b[i]]);
  }
  return zipped;
};

var _arrays_equal = function(left, right) {
  /** Assuming that left and right are both Arrays... */
  if (left.length !== right.length) return false;

  return _zip(left, right).every(function(pair) {
    return _equal(pair[0], pair[1]);
  });
};

var _objects_equal = function(left, right) {
  /** Assuming that left and right are both Objects... */
  var left_keys = Object.keys(left);
  var right_keys = Object.keys(right);
  if (!_arrays_equal(left_keys, right_keys)) return false;

  return left_keys.every(function(key) {
    return _equal(left[key], right[key]);
  });
};

var _equal = function(left, right) {
  /**
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
  // strict equality handles literals, numbers, and strings (a sufficient but not necessary cause)
  if (left === right) return true;
  // check arrays
  if (Array.isArray(left) && Array.isArray(right)) {
    return _arrays_equal(left, right);
  }
  // check objects
  if (Object(left) === left && Object(right) === right) {
    return _objects_equal(left, right);
  }
  // mismatched arrays & objects, etc., are are all inequal
  return false;
};

var _add = function(object, key, value) {
  if (Array.isArray(object)) {
    // `key` must be an index
    if (key == '-') {
      object.push(value);
    }
    else {
      object.splice(key, 0, value);
    }
  }
  else {
    object[key] = value;
  }
};

var _remove = function(object, key) {
  if (Array.isArray(object)) {
    // '-' syntax doesn't make sense when removing
    object.splice(key, 1);
  }
  else {
    // not sure what the proper behavior is when path = ''
    delete object[key];
  }
};

var ops = {
  add: function(object, operation) {
    /**
    >  o  If the target location specifies an array index, a new value is
    >     inserted into the array at the specified index.
    >  o  If the target location specifies an object member that does not
    >     already exist, a new member is added to the object.
    >  o  If the target location specifies an object member that does exist,
    >     that member's value is replaced.
    */
    var endpoint = pointer.at(object, operation.path);
    // it's not exactly a "MissingError" in the same way that `remove` is -- more like a MissingParent, or something
    if (endpoint.parent === undefined) return new errors.MissingError(operation.path);

    return _add(endpoint.parent, endpoint.key, operation.value);
  },
  remove: function(object, operation) {
    /**
    > The "remove" operation removes the value at the target location.
    > The target location MUST exist for the operation to be successful.
    */
    // endpoint has parent, key, and value properties
    var endpoint = pointer.at(object, operation.path);
    if (endpoint.value === undefined) return new errors.MissingError(operation.path);

    // not sure what the proper behavior is when path = ''
    _remove(endpoint.parent, endpoint.key);
  },
  replace: function(object, operation) {
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
    var endpoint = pointer.at(object, operation.path);
    if (endpoint.value === undefined) return new errors.MissingError(operation.path);

    endpoint.parent[endpoint.key] = operation.value;
  },
  move: function(object, operation) {
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
    var from_endpoint = pointer.at(object, operation.from);
    if (from_endpoint.value === undefined) return new errors.MissingError(operation.from);

    var endpoint = pointer.at(object, operation.path);
    if (endpoint.parent === undefined) return new errors.MissingError(operation.path);

    _remove(from_endpoint.parent, from_endpoint.key);
    _add(endpoint.parent, endpoint.key, from_endpoint.value);
  },
  copy: function(object, operation) {
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
    var from_endpoint = pointer.at(object, operation.from);
    if (from_endpoint.value === undefined) return new errors.MissingError(operation.from);
    var endpoint = pointer.at(object, operation.path);
    if (endpoint.parent === undefined) return new errors.MissingError(operation.path);

    _remove(from_endpoint.parent, from_endpoint.key);
    _add(endpoint.parent, endpoint.key, from_endpoint.value);
  },
  test: function(object, operation) {
    /**
    > The "test" operation tests that a value at the target location is
    > equal to a specified value.
    > The operation object MUST contain a "value" member that conveys the
    > value to be compared to the target location's value.
    > The target location MUST be equal to the "value" value for the
    > operation to be considered successful.

    */
    var endpoint = pointer.at(object, operation.path);
    // endpoint.value
    var result = _equal(endpoint.value, operation.value);
    if (!result) return new errors.TestError(endpoint.value, operation.value);
  }
};

var patch = module.exports = function(object, operations) {
  /** Apply a 'application/json-patch+json'-type patch to an object

  operations *must* be an Array. And:

  > Operation objects MUST have exactly one "op" member, whose value
  > indicates the operation to perform.  Its value MUST be one of "add",
  > "remove", "replace", "move", "copy", or "test"; other values are
  > errors.

  patch currently operates in-place.

  Returns list of results, one for each operation.
    - `undefined` denotes success.
    - otherwise, the result will be an instance of one of the *Error prototypes in errors.js.
  */
  return operations.map(function(operation) {
    var opFunc = ops[operation.op];
    // speedy exit if we don't recognize the operation name
    if (opFunc === undefined) return new errors.InvalidOperationError(operation.op);
    return opFunc(object, operation);
  });
};
