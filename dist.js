(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.rfc6902 = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*jslint esnext: true */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.diffAny = diffAny;

var _equal = _dereq_('./equal');

function pushAll(array, xs) {
  return Array.prototype.push.apply(array, xs);
}

function _subtract(a, b) {
  var obj = {};
  for (var add_key in a) {
    obj[add_key] = 1;
  }
  for (var del_key in b) {
    delete obj[del_key];
  }
  return Object.keys(obj);
}

function _intersection(xs) {
  // start similarly to _union
  var obj = {};
  xs.forEach(function (x) {
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
}

function objectType(object) {
  if (object === undefined) {
    return 'undefined';
  }
  if (object === null) {
    return 'null';
  }
  if (Array.isArray(object)) {
    return 'array';
  }
  return typeof object;
}

/**
All diff* functions should return a list of operations, often empty.

Each operation should be an object with two to four fields:
* `op`: the name of the operation; one of "add", "remove", "replace", "move",
  "copy", or "test".
* `path`: a JSON pointer string
* `from`: a JSON pointer string
* `value`: a JSON value

The different operations have different arguments.
* "add": [`path`, `value`]
* "remove": [`path`]
* "replace": [`path`, `value`]
* "move": [`from`, `path`]
* "copy": [`from`, `path`]
* "test": [`path`, `value`]

Currently this only really differentiates between Arrays, Objects, and
Everything Else, which is pretty much just what JSON substantially
differentiates between.
*/

function diffArrays(input, output, ptr) {
  // smarter (levenshtein-like) diffing here
  // var nrows = input.length + 1;
  // var ncols = output.length + 1;
  // set up cost matrix (very simple initialization: just a map)
  // if input (source) is empty, they'll all be in the top row
  var memo = {
    '0,0': { operations: [], cost: 0 }
  };
  // input[i's] -> output[j's]
  var dist = function dist(i, j) {
    // returns object of cost and list of operations needed to get to this place in the matrix
    var memoized = memo[[i, j]];
    if (memoized === undefined) {
      if ((0, _equal.compare)(input[i - 1], output[j - 1])) {
        memoized = dist(i - 1, j - 1); // equal (no cost = no operations)
      } else {
        var directions = [];
        if (i > 0) {
          // NOT topmost row (e.g., )
          directions.push({ dist: dist(i - 1, j), type: 'deletion' });
        }
        if (j > 0) {
          // NOT leftmost column
          directions.push({ dist: dist(i, j - 1), type: 'insertion' });
        }
        if (i > 0 && j > 0) {
          // TABLE MIDDLE
          directions.push({ dist: dist(i - 1, j - 1), type: 'substitution' });
        }
        // the only other case, i === 0 && j === 0, has already been memoized

        // the meat of the algorithm:
        // sort by cost to find the lowest one (might be several ties for lowest)
        // [4, 6, 7, 1, 2].sort(function(a, b) {return a - b;}); -> [ 1, 2, 4, 6, 7 ]
        var best = directions.sort(function (a, b) {
          return a.dist.cost - b.dist.cost;
        })[0];

        var operations = [];
        if (best.type === 'deletion') {
          operations.push({ op: 'remove', path: ptr.add(i - 1).toString() });
        } else if (best.type === 'insertion') {
          var col = j - 1;
          var path = ptr.add(col < input.length ? col : '-'); // '-' is Array-only syntax (like input.length)
          operations.push({ op: 'add', path: path.toString(), value: output[j - 1] });
        } else {
          operations.push({ op: 'replace', path: ptr.add(j - 1).toString(), value: output[j - 1] });
        }
        memoized = {
          // the new operation(s) must be pushed on the end
          operations: best.dist.operations.concat(operations),
          cost: best.dist.cost + 1
        };
      }
      memo[[i, j]] = memoized;
    }
    return memoized;
  };
  var end = dist(input.length, output.length);
  return end.operations;
}

function diffObjects(input, output, ptr) {
  // if a key is in input but not output -> remove
  var operations = [];
  _subtract(input, output).forEach(function (key) {
    operations.push({ op: 'remove', path: ptr.add(key).toString() });
  });
  // if a key is in output but not input -> add
  _subtract(output, input).forEach(function (key) {
    operations.push({ op: 'add', path: ptr.add(key).toString(), value: output[key] });
  });
  // if a key is in both, diff it
  _intersection([input, output]).forEach(function (key) {
    pushAll(operations, diffAny(input[key], output[key], ptr.add(key)));
  });
  return operations;
}

function diffValues(input, output, ptr) {
  var operations = [];
  if (!(0, _equal.compare)(input, output)) {
    operations.push({ op: 'replace', path: ptr.toString(), value: output });
  }
  return operations;
}

function diffAny(input, output, ptr) {
  var input_type = objectType(input);
  var output_type = objectType(output);
  if (input_type == 'array' && output_type == 'array') {
    return diffArrays(input, output, ptr);
  }
  if (input_type == 'object' && output_type == 'object') {
    return diffObjects(input, output, ptr);
  }
  // only pairs of arrays and objects can go down a path to produce a smaller
  // diff; everything else must be wholesale replaced if inequal
  return diffValues(input, output, ptr);
}

},{"./equal":2}],2:[function(_dereq_,module,exports){
/*jslint esnext: true */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compare = compare;
function _zip(a, b) {
  var zipped = [];
  for (var i = 0, l = Math.min(a.length, b.length); i < l; i++) {
    zipped.push([a[i], b[i]]);
  }
  return zipped;
}

/**
Assume that left and right are both Arrays.
*/
function _compareArrays(left, right) {
  if (left.length !== right.length) return false;

  return _zip(left, right).every(function (pair) {
    return compare(pair[0], pair[1]);
  });
}

/**
Assume that left and right are both Objects.
*/
function _compareObjects(left, right) {
  var left_keys = Object.keys(left);
  var right_keys = Object.keys(right);
  if (!_compareArrays(left_keys, right_keys)) return false;

  return left_keys.every(function (key) {
    return compare(left[key], right[key]);
  });
}

/**
Compare returns true if `left` and `right` are materially equal (i.e., would
produce equivalent JSON), false otherwise.

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

function compare(left, right) {
  // strict equality handles literals, numbers, and strings (a sufficient but not necessary cause)
  if (left === right) return true;
  // check arrays
  if (Array.isArray(left) && Array.isArray(right)) {
    return _compareArrays(left, right);
  }
  // check objects
  if (Object(left) === left && Object(right) === right) {
    return _compareObjects(left, right);
  }
  // mismatched arrays & objects, etc., are always inequal
  return false;
}

},{}],3:[function(_dereq_,module,exports){
/*jslint esnext: true */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var MissingError = (function (_Error) {
  function MissingError(path) {
    _classCallCheck(this, MissingError);

    _get(Object.getPrototypeOf(MissingError.prototype), "constructor", this).call(this, "Value required at path: " + path);
    this.name = this.constructor.name;
    this.path = path;
  }

  _inherits(MissingError, _Error);

  return MissingError;
})(Error);

exports.MissingError = MissingError;

var InvalidOperationError = (function (_Error2) {
  function InvalidOperationError(op) {
    _classCallCheck(this, InvalidOperationError);

    _get(Object.getPrototypeOf(InvalidOperationError.prototype), "constructor", this).call(this, "Invalid operation: " + op);
    this.name = this.constructor.name;
    this.op = op;
  }

  _inherits(InvalidOperationError, _Error2);

  return InvalidOperationError;
})(Error);

exports.InvalidOperationError = InvalidOperationError;

var TestError = (function (_Error3) {
  function TestError(actual, expected) {
    _classCallCheck(this, TestError);

    _get(Object.getPrototypeOf(TestError.prototype), "constructor", this).call(this, "Test failed: " + actual + " != " + expected);
    this.name = this.constructor.name;
    this.actual = actual;
    this.expected = expected;
  }

  _inherits(TestError, _Error3);

  return TestError;
})(Error);

exports.TestError = TestError;

},{}],4:[function(_dereq_,module,exports){
/*jslint esnext: true */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.applyPatch = applyPatch;
exports.patch = patch;
exports.createPatch = createPatch;
exports.diff = diff;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _errors = _dereq_('./errors');

var _pointer = _dereq_('./pointer');

var _patch = _dereq_('./patch');

var _diff = _dereq_('./diff');

var _package = _dereq_('./package');

var _package2 = _interopRequireDefault(_package);

var version = _package2['default'].version;

exports.version = version;
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

function applyPatch(object, patch) {
  return patch.map(function (operation) {
    var operationFunction = _patch.operationFunctions[operation.op];
    // speedy exit if we don't recognize the operation name
    if (operationFunction === undefined) {
      return new _errors.InvalidOperationError(operation.op);
    }
    return operationFunction(object, operation);
  });
}

function patch(object, patch) {
  console.error('rfc6902.patch(object, patch) has been deprecated. Use rfc6902.applyPatch(object, patch) instead.');
  return applyPatch(object, patch);
}

/**
Produce a 'application/json-patch+json'-type patch to get from one object to
another.

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of operations to perform on `input` to produce `output`.
*/

function createPatch(input, output) {
  var ptr = new _pointer.Pointer();
  // a new Pointer gets a default path of [''] if not specified
  var operations = (0, _diff.diffAny)(input, output, ptr);
  operations.forEach(function (operation) {
    operation.path = operation.path.toString();
  });
  return operations;
}

function diff(input, output) {
  console.error('rfc6902.diff(input, output) has been deprecated. Use rfc6902.createPatch(input, output) instead.');
  return createPatch(input, output);
}

},{"./diff":1,"./errors":3,"./package":5,"./patch":6,"./pointer":7}],5:[function(_dereq_,module,exports){
module.exports={
  "name": "rfc6902",
  "version": "1.0.3",
  "description": "Complete implementation of RFC6902 (patch and diff)",
  "keywords": [
    "json",
    "patch",
    "diff",
    "rfc6902"
  ],
  "homepage": "https://github.com/chbrown/rfc6902",
  "repository": "git://github.com/chbrown/rfc6902.git",
  "author": "Christopher Brown <io@henrian.com> (http://henrian.com)",
  "license": "MIT",
  "main": "./dist.js",
  "dependencies": {},
  "devDependencies": {
    "babel": "*",
    "babelify": "*",
    "browserify": "*",
    "derequire": "*",
    "js-yaml": "*",
    "mocha": "*"
  },
  "scripts": {
    "test": "make test"
  }
}

},{}],6:[function(_dereq_,module,exports){
/*jslint esnext: true */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _pointer = _dereq_('./pointer');

var _equal = _dereq_('./equal');

var _errors = _dereq_('./errors');

function _add(object, key, value) {
  if (Array.isArray(object)) {
    // `key` must be an index
    if (key == '-') {
      object.push(value);
    } else {
      object.splice(key, 0, value);
    }
  } else {
    object[key] = value;
  }
}

function _remove(object, key) {
  if (Array.isArray(object)) {
    // '-' syntax doesn't make sense when removing
    object.splice(key, 1);
  } else {
    // not sure what the proper behavior is when path = ''
    delete object[key];
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
function add(object, operation) {
  var endpoint = _pointer.Pointer.fromJSON(operation.path).evaluate(object);
  // it's not exactly a "MissingError" in the same way that `remove` is -- more like a MissingParent, or something
  if (endpoint.parent === undefined) {
    return new _errors.MissingError(operation.path);
  }
  _add(endpoint.parent, endpoint.key, operation.value);
  return null;
}

/**
> The "remove" operation removes the value at the target location.
> The target location MUST exist for the operation to be successful.
*/
function remove(object, operation) {
  // endpoint has parent, key, and value properties
  var endpoint = _pointer.Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.value === undefined) {
    return new _errors.MissingError(operation.path);
  }
  // not sure what the proper behavior is when path = ''
  _remove(endpoint.parent, endpoint.key);
  return null;
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
function replace(object, operation) {
  var endpoint = _pointer.Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.value === undefined) return new _errors.MissingError(operation.path);

  endpoint.parent[endpoint.key] = operation.value;
  return null;
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
function move(object, operation) {
  var from_endpoint = _pointer.Pointer.fromJSON(operation.from).evaluate(object);
  if (from_endpoint.value === undefined) return new _errors.MissingError(operation.from);

  var endpoint = _pointer.Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.parent === undefined) return new _errors.MissingError(operation.path);

  _remove(from_endpoint.parent, from_endpoint.key);
  _add(endpoint.parent, endpoint.key, from_endpoint.value);
  return null;
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
function copy(object, operation) {
  var from_endpoint = _pointer.Pointer.fromJSON(operation.from).evaluate(object);
  if (from_endpoint.value === undefined) return new _errors.MissingError(operation.from);
  var endpoint = _pointer.Pointer.fromJSON(operation.path).evaluate(object);
  if (endpoint.parent === undefined) return new _errors.MissingError(operation.path);

  _remove(from_endpoint.parent, from_endpoint.key);
  _add(endpoint.parent, endpoint.key, from_endpoint.value);
  return null;
}

/**
> The "test" operation tests that a value at the target location is
> equal to a specified value.
> The operation object MUST contain a "value" member that conveys the
> value to be compared to the target location's value.
> The target location MUST be equal to the "value" value for the
> operation to be considered successful.
*/
function test(object, operation) {
  var endpoint = _pointer.Pointer.fromJSON(operation.path).evaluate(object);
  var result = (0, _equal.compare)(endpoint.value, operation.value);
  if (!result) return new _errors.TestError(endpoint.value, operation.value);
  return null;
}

var operationFunctions = {
  add: add,
  remove: remove,
  replace: replace,
  move: move,
  copy: copy,
  test: test
};
exports.operationFunctions = operationFunctions;

},{"./equal":2,"./errors":3,"./pointer":7}],7:[function(_dereq_,module,exports){
/*jslint esnext: true */
/**
Unescape token part of a JSON Pointer string

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
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function unescape(token) {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Escape token part of a JSON Pointer string

> '~' needs to be encoded as '~0' and '/'
> needs to be encoded as '~1' when these characters appear in a
> reference token.

This is the exact inverse of `unescape()`, so the reverse replacements must take place in reverse order.
*/
function escape(token) {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
JSON Pointer representation
*/

var Pointer = (function () {
  function Pointer(tokens) {
    _classCallCheck(this, Pointer);

    this.tokens = tokens || [''];
  }

  _createClass(Pointer, [{
    key: 'toString',
    value: function toString() {
      return this.tokens.map(escape).join('/');
    }
  }, {
    key: 'evaluate',

    /**
    Returns an object with 'parent', 'key', and 'value' properties.
    In the special case that pointer = "", parent and key will be null, and `value = obj`
    Otherwise, parent will be the such that `parent[key] == value`
    */
    value: function evaluate(object) {
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
        value: object
      };
    }
  }, {
    key: 'push',
    value: function push(token) {
      // mutable
      this.tokens.push(token);
    }
  }, {
    key: 'add',

    /**
    `token` should be a String. It'll be coerced to one anyway.
     immutable (shallowly)
    */
    value: function add(token) {
      var tokens = this.tokens.concat(String(token));
      return new Pointer(tokens);
    }
  }], [{
    key: 'fromJSON',

    /**
    `path` *must* be a properly escaped string.
    */
    value: function fromJSON(path) {
      var tokens = path.split('/').map(unescape);
      if (tokens[0] !== '') throw new Error('Invalid JSON Pointer: ' + path);
      return new Pointer(tokens);
    }
  }]);

  return Pointer;
})();

exports.Pointer = Pointer;

},{}]},{},[4])(4)
});