(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.rfc6902 = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _toConsumableArray = function (arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } };

exports.isDestructive = isDestructive;

/**
subtract(a, b) returns the keys in `a` that are not in `b`.
*/
exports.subtract = subtract;

/**
intersection(objects) returns the keys that shared by all given `objects`.
*/
exports.intersection = intersection;
exports.objectType = objectType;

/**
Array-diffing smarter (levenshtein-like) diffing here

To get from the input ABC to the output AZ we could just delete all the input
and say "insert A, insert Z" and be done with it. That's what we do if the
input is empty. But we can be smarter.

          output
               A   Z
               -   -
          [0]  1   2
input A |  1  [0]  1
      B |  2  [1]  1
      C |  3   2  [2]

1) start at 0,0 (+0)
2) keep A (+0)
3) remove B (+1)
4) replace C with Z (+1)

if input (source) is empty, they'll all be in the top row, just a bunch of
additions. If the output is empty, everything will be in the left column, as a
bunch of deletions.
*/
exports.diffArrays = diffArrays;
exports.diffObjects = diffObjects;
exports.diffValues = diffValues;
exports.diffAny = diffAny;
Object.defineProperty(exports, "__esModule", {
    value: true
});

var compare = _dereq_("./equal").compare;

function isDestructive(_ref) {
    var op = _ref.op;

    return op === "remove" || op === "replace" || op === "copy" || op === "move";
}

function subtract(a, b) {
    var obj = {};
    for (var add_key in a) {
        obj[add_key] = 1;
    }
    for (var del_key in b) {
        delete obj[del_key];
    }
    return Object.keys(obj);
}

function intersection(objects) {
    // initialize like union()
    var key_counts = {};
    objects.forEach(function (object) {
        for (var key in object) {
            key_counts[key] = (key_counts[key] || 0) + 1;
        }
    });
    // but then, extra requirement: delete less commonly-seen keys
    var threshold = objects.length;
    for (var key in key_counts) {
        if (key_counts[key] < threshold) {
            delete key_counts[key];
        }
    }
    return Object.keys(key_counts);
}

function objectType(object) {
    if (object === undefined) {
        return "undefined";
    }
    if (object === null) {
        return "null";
    }
    if (Array.isArray(object)) {
        return "array";
    }
    return typeof object;
}

function isArrayAdd(array_operation) {
    return array_operation.op === "add";
}
function isArrayRemove(array_operation) {
    return array_operation.op === "remove";
}
function isArrayReplace(array_operation) {
    return array_operation.op === "replace";
}
function diffArrays(input, output, ptr) {
    // set up cost matrix (very simple initialization: just a map)
    var memo = {
        "0,0": { operations: [], cost: 0 }
    };
    /**
    input[i's] -> output[j's]
       Given the layout above, i is the row, j is the col
       returns a list of Operations needed to get to from input.slice(0, i) to
    output.slice(0, j), the each marked with the total cost of getting there.
    `cost` is a non-negative integer.
    Recursive.
    */
    function dist(i, j) {
        // memoized
        var memoized = memo[i + "," + j];
        if (memoized === undefined) {
            if (compare(input[i - 1], output[j - 1])) {
                // equal (no operations => no cost)
                memoized = dist(i - 1, j - 1);
            } else {
                var alternatives = [];
                if (i > 0) {
                    // NOT topmost row
                    var remove_alternative = dist(i - 1, j);
                    alternatives.push({
                        // the new operation must be pushed on the end
                        operations: remove_alternative.operations.concat({
                            op: "remove",
                            index: i - 1 }),
                        cost: remove_alternative.cost + 1 });
                }
                if (j > 0) {
                    // NOT leftmost column
                    var add_alternative = dist(i, j - 1);
                    alternatives.push({
                        operations: add_alternative.operations.concat({
                            op: "add",
                            index: i - 1,
                            value: output[j - 1] }),
                        cost: add_alternative.cost + 1 });
                }
                if (i > 0 && j > 0) {
                    // TABLE MIDDLE
                    // supposing we replaced it, compute the rest of the costs:
                    var replace_alternative = dist(i - 1, j - 1);
                    // okay, the general plan is to replace it, but we can be smarter,
                    // recursing into the structure and replacing only part of it if
                    // possible, but to do so we'll need the original value
                    alternatives.push({
                        operations: replace_alternative.operations.concat({
                            op: "replace",
                            index: i - 1,
                            original: input[i - 1],
                            value: output[j - 1] }),
                        cost: replace_alternative.cost + 1 });
                }
                // the only other case, i === 0 && j === 0, has already been memoized
                // the meat of the algorithm:
                // sort by cost to find the lowest one (might be several ties for lowest)
                // [4, 6, 7, 1, 2].sort((a, b) => a - b); -> [ 1, 2, 4, 6, 7 ]
                var best = alternatives.sort(function (a, b) {
                    return a.cost - b.cost;
                })[0];
                memoized = best;
            }
            memo[i + "," + j] = memoized;
        }
        return memoized;
    }
    // handle weird objects masquerading as Arrays that don't have proper length
    // properties by using 0 for everything but positive numbers
    var input_length = isNaN(input.length) || input.length <= 0 ? 0 : input.length;
    var output_length = isNaN(output.length) || output.length <= 0 ? 0 : output.length;
    var array_operations = dist(input_length, output_length).operations;

    var _array_operations$reduce = array_operations.reduce(function (_ref, array_operation) {
        var _ref2 = _slicedToArray(_ref, 2);

        var operations = _ref2[0];
        var padding = _ref2[1];

        if (isArrayAdd(array_operation)) {
            var padded_index = array_operation.index + 1 + padding;
            var index_token = padded_index < input_length + padding ? String(padded_index) : "-";
            var operation = {
                op: array_operation.op,
                path: ptr.add(index_token).toString(),
                value: array_operation.value };
            // padding++; // maybe only if array_operation.index > -1 ?
            return [operations.concat(operation), padding + 1];
        } else if (isArrayRemove(array_operation)) {
            var operation = {
                op: array_operation.op,
                path: ptr.add(String(array_operation.index + padding)).toString() };
            // padding--;
            return [operations.concat(operation), padding - 1];
        } else {
            var replace_ptr = ptr.add(String(array_operation.index + padding));
            var replace_operations = diffAny(array_operation.original, array_operation.value, replace_ptr);
            return [operations.concat.apply(operations, _toConsumableArray(replace_operations)), padding];
        }
    }, [[], 0]);

    var _array_operations$reduce2 = _slicedToArray(_array_operations$reduce, 2);

    var operations = _array_operations$reduce2[0];
    var padding = _array_operations$reduce2[1];

    return operations;
}

function diffObjects(input, output, ptr) {
    // if a key is in input but not output -> remove it
    var operations = [];
    subtract(input, output).forEach(function (key) {
        operations.push({ op: "remove", path: ptr.add(key).toString() });
    });
    // if a key is in output but not input -> add it
    subtract(output, input).forEach(function (key) {
        operations.push({ op: "add", path: ptr.add(key).toString(), value: output[key] });
    });
    // if a key is in both, diff it recursively
    intersection([input, output]).forEach(function (key) {
        operations.push.apply(operations, _toConsumableArray(diffAny(input[key], output[key], ptr.add(key))));
    });
    return operations;
}

function diffValues(input, output, ptr) {
    if (!compare(input, output)) {
        return [{ op: "replace", path: ptr.toString(), value: output }];
    }
    return [];
}

function diffAny(input, output, ptr) {
    var input_type = objectType(input);
    var output_type = objectType(output);
    if (input_type == "array" && output_type == "array") {
        return diffArrays(input, output, ptr);
    }
    if (input_type == "object" && output_type == "object") {
        return diffObjects(input, output, ptr);
    }
    // only pairs of arrays and objects can go down a path to produce a smaller
    // diff; everything else must be wholesale replaced if inequal
    return diffValues(input, output, ptr);
}

},{"./equal":2}],2:[function(_dereq_,module,exports){

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
"use strict";

exports.compare = compare;
Object.defineProperty(exports, "__esModule", {
    value: true
});
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
    if (left.length !== right.length) {
        return false;
    }return zip(left, right).every(function (pair) {
        return compare(pair[0], pair[1]);
    });
}
/**
compareObjects(left, right) assumes that `left` and `right` are both Objects.
*/
function compareObjects(left, right) {
    var left_keys = Object.keys(left);
    var right_keys = Object.keys(right);
    if (!compareArrays(left_keys, right_keys)) {
        return false;
    }return left_keys.every(function (key) {
        return compare(left[key], right[key]);
    });
}
function compare(left, right) {
    // strict equality handles literals, numbers, and strings (a sufficient but not necessary cause)
    if (left === right) {
        return true;
    } // check arrays
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

},{}],3:[function(_dereq_,module,exports){
"use strict";

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});

var MissingError = exports.MissingError = (function (_Error) {
    function MissingError(path) {
        _classCallCheck(this, MissingError);

        _get(Object.getPrototypeOf(MissingError.prototype), "constructor", this).call(this, "Value required at path: " + path);
        this.path = path;
        this.name = this.constructor.name;
    }

    _inherits(MissingError, _Error);

    return MissingError;
})(Error);

var InvalidOperationError = exports.InvalidOperationError = (function (_Error2) {
    function InvalidOperationError(op) {
        _classCallCheck(this, InvalidOperationError);

        _get(Object.getPrototypeOf(InvalidOperationError.prototype), "constructor", this).call(this, "Invalid operation: " + op);
        this.op = op;
        this.name = this.constructor.name;
    }

    _inherits(InvalidOperationError, _Error2);

    return InvalidOperationError;
})(Error);

var TestError = exports.TestError = (function (_Error3) {
    function TestError(actual, expected) {
        _classCallCheck(this, TestError);

        _get(Object.getPrototypeOf(TestError.prototype), "constructor", this).call(this, "Test failed: " + actual + " != " + expected);
        this.actual = actual;
        this.expected = expected;
        this.name = this.constructor.name;
        this.actual = actual;
        this.expected = expected;
    }

    _inherits(TestError, _Error3);

    return TestError;
})(Error);

},{}],4:[function(_dereq_,module,exports){
"use strict";

var _interopRequireWildcard = function (obj) { return obj && obj.__esModule ? obj : { "default": obj }; };

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
exports.applyPatch = applyPatch;

/**
Produce a 'application/json-patch+json'-type patch to get from one object to
another.

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of operations to perform on `input` to produce `output`.
*/
exports.createPatch = createPatch;

/**
Produce an 'application/json-patch+json'-type list of tests, to verify that
existing values in an object are identical to the those captured at some
checkpoint (whenever this function is called).

This does not alter `input` or `output` unless they have a property getter with
side-effects (which is not a good idea anyway).

Returns list of test operations.
*/
exports.createTests = createTests;
Object.defineProperty(exports, "__esModule", {
    value: true
});

var InvalidOperationError = _dereq_("./errors").InvalidOperationError;

var Pointer = _dereq_("./pointer").Pointer;

var operationFunctions = _interopRequireWildcard(_dereq_("./patch"));

var _diff = _dereq_("./diff");

var diffAny = _diff.diffAny;
var isDestructive = _diff.isDestructive;

function applyPatch(object, patch) {
    return patch.map(function (operation) {
        var operationFunction = operationFunctions[operation.op];
        // speedy exit if we don't recognize the operation name
        if (operationFunction === undefined) {
            return new InvalidOperationError(operation.op);
        }
        return operationFunction(object, operation);
    });
}

function createPatch(input, output) {
    var ptr = new Pointer();
    // a new Pointer gets a default path of [''] if not specified
    return diffAny(input, output, ptr);
}

function createTest(input, path) {
    var endpoint = Pointer.fromJSON(path).evaluate(input);
    if (endpoint !== undefined) {
        return { op: "test", path: path, value: endpoint.value };
    }
}
function createTests(input, patch) {
    var tests = new Array();
    patch.filter(isDestructive).forEach(function (operation) {
        var pathTest = createTest(input, operation.path);
        if (pathTest) tests.push(pathTest);
        if ("from" in operation) {
            var fromTest = createTest(input, operation.from);
            if (fromTest) tests.push(fromTest);
        }
    });
    return tests;
}

},{"./diff":1,"./errors":3,"./patch":5,"./pointer":6}],5:[function(_dereq_,module,exports){

/**
>  o  If the target location specifies an array index, a new value is
>     inserted into the array at the specified index.
>  o  If the target location specifies an object member that does not
>     already exist, a new member is added to the object.
>  o  If the target location specifies an object member that does exist,
>     that member's value is replaced.
*/
"use strict";

exports.add = add;

/**
> The "remove" operation removes the value at the target location.
> The target location MUST exist for the operation to be successful.
*/
exports.remove = remove;

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
exports.replace = replace;

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
exports.move = move;

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
exports.copy = copy;

/**
> The "test" operation tests that a value at the target location is
> equal to a specified value.
> The operation object MUST contain a "value" member that conveys the
> value to be compared to the target location's value.
> The target location MUST be equal to the "value" value for the
> operation to be considered successful.
*/
exports.test = test;
Object.defineProperty(exports, "__esModule", {
    value: true
});

var Pointer = _dereq_("./pointer").Pointer;

var compare = _dereq_("./equal").compare;

var _errors = _dereq_("./errors");

var MissingError = _errors.MissingError;
var TestError = _errors.TestError;

function _add(object, key, value) {
    if (Array.isArray(object)) {
        // `key` must be an index
        if (key == "-") {
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
function add(object, operation) {
    var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    // it's not exactly a "MissingError" in the same way that `remove` is -- more like a MissingParent, or something
    if (endpoint.parent === undefined) {
        return new MissingError(operation.path);
    }
    _add(endpoint.parent, endpoint.key, operation.value);
    return null;
}

function remove(object, operation) {
    // endpoint has parent, key, and value properties
    var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    if (endpoint.value === undefined) {
        return new MissingError(operation.path);
    }
    // not sure what the proper behavior is when path = ''
    _remove(endpoint.parent, endpoint.key);
    return null;
}

function replace(object, operation) {
    var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    if (endpoint.value === undefined) {
        return new MissingError(operation.path);
    }endpoint.parent[endpoint.key] = operation.value;
    return null;
}

function move(object, operation) {
    var from_endpoint = Pointer.fromJSON(operation.from).evaluate(object);
    if (from_endpoint.value === undefined) {
        return new MissingError(operation.from);
    }var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    if (endpoint.parent === undefined) {
        return new MissingError(operation.path);
    }_remove(from_endpoint.parent, from_endpoint.key);
    _add(endpoint.parent, endpoint.key, from_endpoint.value);
    return null;
}

function copy(object, operation) {
    var from_endpoint = Pointer.fromJSON(operation.from).evaluate(object);
    if (from_endpoint.value === undefined) {
        return new MissingError(operation.from);
    }var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    if (endpoint.parent === undefined) {
        return new MissingError(operation.path);
    }_remove(from_endpoint.parent, from_endpoint.key);
    _add(endpoint.parent, endpoint.key, from_endpoint.value);
    return null;
}

function test(object, operation) {
    var endpoint = Pointer.fromJSON(operation.path).evaluate(object);
    var result = compare(endpoint.value, operation.value);
    if (!result) {
        return new TestError(endpoint.value, operation.value);
    }return null;
}

},{"./equal":2,"./errors":3,"./pointer":6}],6:[function(_dereq_,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

Object.defineProperty(exports, "__esModule", {
    value: true
});
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
function unescape(token) {
    return token.replace(/~1/g, "/").replace(/~0/g, "~");
}
/** Escape token part of a JSON Pointer string

> '~' needs to be encoded as '~0' and '/'
> needs to be encoded as '~1' when these characters appear in a
> reference token.

This is the exact inverse of `unescape()`, so the reverse replacements must take place in reverse order.
*/
function escape(token) {
    return token.replace(/~/g, "~0").replace(/\//g, "~1");
}
/**
JSON Pointer representation
*/

var Pointer = exports.Pointer = (function () {
    function Pointer() {
        var tokens = arguments[0] === undefined ? [""] : arguments[0];

        _classCallCheck(this, Pointer);

        this.tokens = tokens;
    }

    _createClass(Pointer, {
        toString: {
            value: function toString() {
                return this.tokens.map(escape).join("/");
            }
        },
        evaluate: {
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
                    value: object };
            }
        },
        push: {
            value: function push(token) {
                // mutable
                this.tokens.push(token);
            }
        },
        add: {
            /**
            `token` should be a String. It'll be coerced to one anyway.
               immutable (shallowly)
            */

            value: function add(token) {
                var tokens = this.tokens.concat(String(token));
                return new Pointer(tokens);
            }
        }
    }, {
        fromJSON: {
            /**
            `path` *must* be a properly escaped string.
            */

            value: function fromJSON(path) {
                var tokens = path.split("/").map(unescape);
                if (tokens[0] !== "") throw new Error("Invalid JSON Pointer: " + path);
                return new Pointer(tokens);
            }
        }
    });

    return Pointer;
})();

},{}]},{},[4])(4)
});