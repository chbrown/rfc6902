/*jslint esnext: true */
import {compare} from './equal';

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
  xs.forEach(x => {
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

/**
Array-diffing smarter (levenshtein-like) diffing here

To get from the input ABC to the output AZ we could just delete all the input
and say "insert A, insert Z" and be done with it. That's what we do if the
input is empty. But we can be smarter.

          output
          A Z
        0 1 2
input A 1 0 1
      B 2 1 2
      C 3 2 3

if input (source) is empty, they'll all be in the top row, just a bunch of
additions. If the output is empty, everything will be in the left column, as a
bunch of deletions.
*/
function diffArrays(input, output, ptr) {
  // set up cost matrix (very simple initialization: just a map)
  var memo = {
    '0,0': {operations: [], cost: 0}
  };
  /**

  input[i's] -> output[j's]
  */
  function dist(i, j) {
    // returns object of cost and list of operations needed to get to this place in the matrix
    var memoized = memo[[i, j]];
    if (memoized === undefined) {
      if (compare(input[i - 1], output[j - 1])) {
        memoized = dist(i - 1 , j - 1); // equal (no cost = no operations)
      }
      else {
        var directions = [];
        if (i > 0) {
          // NOT topmost row
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
        var best = directions.sort((a, b) => a.dist.cost - b.dist.cost)[0];

        var operations = [];
        if (best.type === 'deletion') {
          operations.push({op: 'remove', path: ptr.add(i - 1).toString()});
        }
        else if (best.type === 'insertion') {
          var col = j - 1;
          var path = ptr.add(col < input.length ? col : '-'); // '-' is Array-only syntax (like input.length)
          operations.push({op: 'add', path: path.toString(), value: output[j - 1]});
        }
        else {
          operations.push({op: 'replace', path: ptr.add(j - 1).toString(), value: output[j - 1]});
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
  }
  var end = dist(input.length, output.length);
  return end.operations.reverse();
}

function diffObjects(input, output, ptr) {
  // if a key is in input but not output -> remove
  var operations = [];
  _subtract(input, output).forEach(key => {
    operations.push({op: 'remove', path: ptr.add(key).toString()});
  });
  // if a key is in output but not input -> add
  _subtract(output, input).forEach(key => {
    operations.push({op: 'add', path: ptr.add(key).toString(), value: output[key]});
  });
  // if a key is in both, diff it
  _intersection([input, output]).forEach(key => {
    pushAll(operations, diffAny(input[key], output[key], ptr.add(key)));
  });
  return operations;
}

function diffValues(input, output, ptr) {
  var operations = [];
  if (!compare(input, output)) {
    operations.push({op: 'replace', path: ptr.toString(), value: output});
  }
  return operations;
}

export function diffAny(input, output, ptr) {
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
