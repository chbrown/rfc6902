var require = function(name) { return this[name.split('/').slice(1).join('/')]; };
(function(exports) {/*globals exports */
var _zip = function(a, b) {
  var zipped = [];
  for (var i = 0, l = Math.min(a.length, b.length); i < l; i++) {
    zipped.push([a[i], b[i]]);
  }
  return zipped;
};

var _equalArrays = function(left, right) {
  /** Assuming that left and right are both Arrays... */
  if (left.length !== right.length) return false;

  return _zip(left, right).every(function(pair) {
    return equal(pair[0], pair[1]);
  });
};

var _equalObjects = function(left, right) {
  /** Assuming that left and right are both Objects... */
  var left_keys = Object.keys(left);
  var right_keys = Object.keys(right);
  if (!_equalArrays(left_keys, right_keys)) return false;

  return left_keys.every(function(key) {
    return equal(left[key], right[key]);
  });
};

var equal = exports.equal = function(left, right) {
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
    return _equalArrays(left, right);
  }
  // check objects
  if (Object(left) === left && Object(right) === right) {
    return _equalObjects(left, right);
  }
  // mismatched arrays & objects, etc., are are all inequal
  return false;
};
})(this['equal'] = {});
(function(exports) {/*globals exports, require */
var MissingError = exports.MissingError = function(path) {
  this.path = path;
};
MissingError.prototype.toString = function() {
  return 'Value required at path: ' + this.path;
};

var InvalidOperationError = exports.InvalidOperationError = function(op) {
  this.op = op;
};
InvalidOperationError.prototype.toString = function() {
  return 'Invalid operation: ' + this.op;
};

var TestError = exports.TestError = function(found, wanted) {
  this.found = found;
  this.wanted = wanted;
};
TestError.prototype.toString = function() {
  return 'Test failed: ' + this.found + ' != ' + this.wanted;
};
})(this['errors'] = {});
(function(exports) {/*globals exports */
var unescape = function(token) {
  /** Unescape token part of a JSON Pointer string

  `token` should *not* contain any '/' characters.

  > Evaluation of each reference token begins by decoding any escaped
  > character sequence.  This is performed by first transforming any
  > occurrence of the sequence '~1' to '/', and then transforming any
  > occurrence of the sequence '~0' to '~'.  By performing the
  > substitutions in this order, an implementation avoids the error of
  > turning '~01' first into '~1' and then into '/', which would be
  > incorrect (the string '~01' correctly becomes '~1' after
  > transformation).

  Here's my take:

  ~1 is unescaped with higher priority than ~0 because it is a lower-order escape character.
  I say "lower order" because '/' needs escaping due to the JSON Pointer serialization technique.
  Whereas, '~' is escaped because escaping '/' uses the '~' character.
  */
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
};

var escape = function(token) {
  /** Escape token part of a JSON Pointer string

  > '~' needs to be encoded as '~0' and '/'
  > needs to be encoded as '~1' when these characters appear in a
  > reference token.

  This is the exact inverse of `unescape()`, so the reverse replacements must take place in reverse order.

  */
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
};

var Pointer = exports.Pointer = function(tokens) {
  /** JSON Pointer (http://tools.ietf.org/html/rfc6901) resolver.
  */
  this.tokens = tokens || [''];
};
Pointer.parse = function(path) {
  /**
  `path` *must* be a properly escaped string.
  */
  var tokens = path.split('/').map(unescape);
  if (tokens[0] !== '') throw new Error('Invalid JSON Pointer: ' + path);
  return new Pointer(tokens);
};
Pointer.prototype.toString = Pointer.prototype.toJSON = function() {
  return this.tokens.map(escape).join('/');
};
Pointer.prototype.evaluate = function(object) {
  /**

  Returns an object with 'parent', 'key', and 'value' properties.
  In the special case that pointer = "", parent and key will be null, and `value = obj`
  Otherwise, parent will be the such that `parent[key] == value`
  */
  var parent = null;
  var token = null;
  for (var i = 1, l = this.tokens.length; i < l; i++) {
    parent = object;
    token = this.tokens[i];
    // not sure if this the best way to handle non-existant paths...
    object = (parent || {})[token];
  }
  return {
    parent: parent,
    key: token,
    value: object,
  };
};
Pointer.prototype.push = function(token) {
  // mutable
  this.tokens.push(token);
};
Pointer.prototype.add = function(token) {
  /**
  `token` should be a String. It'll be coerced to one anyway.

  immutable (shallowly)
  */
  var tokens = this.tokens.concat(String(token));
  return new Pointer(tokens);
};
})(this['pointer'] = {});
(function(exports) {/*globals exports, require */
var pointer = require('./pointer');
var errors = require('./errors');
var equal = require('./equal').equal;

var pushAll = function(array, xs) { return Array.prototype.push.apply(array, xs); };

var _union = function(xs) {
  var obj = {};
  xs.forEach(function(x) {
    for (var key in x) {
      obj[key] = 1;
    }
  });
  return Object.keys(obj);
};

var _subtract = function(a, b) {
  var obj = {};
  for (var add_key in a) {
    obj[add_key] = 1;
  }
  for (var del_key in b) {
    delete obj[del_key];
  }
  return Object.keys(obj);
};

var _intersection = function(xs) {
  // start similarly to _union
  var obj = {};
  xs.forEach(function(x) {
    for (var key in x) {
      obj[key] = (obj[key] || 0) + 1;
    }
  });
  // but then, extra requirement: delete less commonly-seen keys
  var threshold = xs.length;
  for (var key in obj) {
    if (obj[key] < threshold) {
      delete obj[key];
    }
  }
  return Object.keys(obj);
};

/**
All _diff* functions should return a list of operations, often empty.

Currently only really differentiates between Arrays, Objects, and Everything Else.
*/

var _diffArraysStupid = function(input, output, ptr) {
  // do the stupid thing first...
  var operations = [];
  for (var i = 0, l = Math.max(input.length, output.length); i < l; i++) {
    pushAll(operations, _diff(input[i], output[i], ptr.add(i)));
    // if (input[i] !== undefined && output[i] !== ) {
  }
  // console.log('_diffArrays', operations);
  return operations;
};

var _diffArraysSearch = function(input, output, ptr) {
  // smarter (levenshtein-like) diffing here
  // var nrows = input.length + 1;
  // var ncols = output.length + 1;
  // set up cost matrix (very simple initialization: just a map)
  // if input (source) is empty, they'll all be in the top row
  var memo = {
    '0,0': {operations: [], cost: 0}
  };
  // input[i's] -> output[j's]
  var dist = function(i, j) {
    // returns object of cost and list of operations needed to get to this place in the matrix
    var memoized = memo[[i, j]];
    if (memoized === undefined) {
      if (equal(input[i - 1], output[j - 1])) {
        memoized = dist(i - 1 , j - 1); // equal (no cost = no operations)
      }
      else {
        var directions = [];
        if (i > 0) {
          // NOT topmost row (e.g., )
          directions.push({dist: dist(i-1, j  ), type: 'deletion'});
        }
        if (j > 0) {
          // NOT leftmost column
          directions.push({dist: dist(i  , j-1), type: 'insertion'});
        }
        if (i > 0 && j > 0) {
          // TABLE MIDDLE
          directions.push({dist: dist(i-1, j-1), type: 'substitution'});
        }
        // the only other case, i === 0 && j === 0, has already been memoized

        // the meat of the algorithm:
        // sort by cost to find the lowest one (might be several ties for lowest)
        // [4, 6, 7, 1, 2].sort(function(a, b) {return a - b;}); -> [ 1, 2, 4, 6, 7 ]
        var best = directions.sort(function(a, b) {
          return a.dist.cost - b.dist.cost;
        })[0];

        var operations = [];
        if (best.type === 'deletion') {
          operations.push({op: 'remove', path: ptr.add(i - 1)});
        }
        else if (best.type === 'insertion') {
          var col = j - 1;
          var path = ptr.add(col < input.length ? col : '-'); // '-' is Array-only syntax (like input.length)
          operations.push({op: 'add', path: path, value: output[j - 1]});
        }
        else {
          operations.push({op: 'replace', path: ptr.add(j - 1), value: output[j - 1]});
        }
        memoized = {
          // the new operation(s) must be pushed on the end
          operations: best.dist.operations.concat(operations),
          cost: best.dist.cost + 1,
        };
      }
      memo[[i, j]] = memoized;
    }
    return memoized;
  };
  var end = dist(input.length, output.length);
  // console.error("smart:", end.operations);
  return end.operations;
};

var _diffArrays = _diffArraysSearch;

var _diffObjects = function(input, output, ptr) {
  // if a key is in input but not output -> remove
  var operations = [];
  _subtract(input, output).forEach(function(key) {
    operations.push({op: 'remove', path: ptr.add(key)});
  });
  // if a key is in output but not input -> add
  _subtract(output, input).forEach(function(key) {
    operations.push({op: 'add', path: ptr.add(key), value: output[key]});
  });
  // if a key is in both, diff it
  _intersection([input, output]).forEach(function(key) {
    pushAll(operations, _diff(input[key], output[key], ptr.add(key)));
  });
  // console.log('_diffObjects', operations);
  return operations;
};

var _diffValues = function(input, output, ptr) {
  var operations = [];
  if (!equal(input, output)) {
    operations.push({op: 'replace', path: ptr, value: output});
  }
  // console.log('_diffValues', operations);
  return operations;
};

var _diff = function(input, output, ptr) {
  // Arrays first, since Arrays are subsets of Objects
  if (Array.isArray(input) && Array.isArray(output)) {
    return _diffArrays(input, output, ptr);
  }

  if (input === Object(input) && output === Object(output)) {
    return _diffObjects(input, output, ptr);
  }

  // only pairs of arrays and objects can go down a path to produce a smaller diff;
  // everything else must be wholesale replaced if inequal
  return _diffValues(input, output, ptr);
};

var diff = exports.diff = function(input, output) {
  /** Produce a 'application/json-patch+json'-type patch to get from one object to another

  This does not alter `input` or `output` unless they have a property getter with side-effects
  (which is not a good idea anyway).

  Returns list of operations to perform on `input` to produce `output`.
  */
  var ptr = new pointer.Pointer();
  // a new Pointer gets a default path of [''] if not specified
  var operations = _diff(input, output, ptr);
  operations.forEach(function(operation) {
    operation.path = operation.path.toString();
  });
  return operations;
};

var print_diff = function(input, output) {
  console.log('input:', input);
  console.log('output:', output);

  var ops = diff(input, output);

  var util = require('util');
  console.log(ops.length + ' ops...');
  ops.forEach(function(op) {
    // var op_str = util.inspect(op, {depth: null});
    console.log(JSON.stringify(op, null, '  '));
  });
};
})(this['diff'] = {});
(function(exports) {/*globals exports, require */
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
})(this['patch'] = {});