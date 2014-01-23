/*globals exports, require */
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
