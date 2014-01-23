/*globals exports, require */
var pointer = require('./pointer');
var errors = require('./errors');
var equal = require('./equal').equal;

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
    var endpoint = pointer.Pointer.parse(operation.path).evaluate(object);
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
    var endpoint = pointer.Pointer.parse(operation.path).evaluate(object);
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
    var endpoint = pointer.Pointer.parse(operation.path).evaluate(object);
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
    var from_endpoint = pointer.Pointer.parse(operation.from).evaluate(object);
    if (from_endpoint.value === undefined) return new errors.MissingError(operation.from);

    var endpoint = pointer.Pointer.parse(operation.path).evaluate(object);
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
    var from_endpoint = pointer.Pointer.parse(operation.from).evaluate(object);
    if (from_endpoint.value === undefined) return new errors.MissingError(operation.from);
    var endpoint = pointer.Pointer.parse(operation.path).evaluate(object);
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
    var endpoint = pointer.Pointer.parse(operation.path).evaluate(object);
    // endpoint.value
    var result = equal(endpoint.value, operation.value);
    if (!result) return new errors.TestError(endpoint.value, operation.value);
  }
};

var patch = exports.patch = function(object, operations) {
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
