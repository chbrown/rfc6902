'use strict'; /*jslint node: true, es5: true, indent: 2 */
var pointer = require('./pointer');
var errors = require('./errors');

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


var _diffArrays = function(input, output, ptr) {
  // do the stupid thing first...
  var operations = [];
  for (var i = 0, l = Math.max(input.length, output.length); i < l; i++) {
    var operation = _diff(input[i], output[i], ptr.add(i));
    operations.push(operation);
    // if (input[i] !== undefined && output[i] !== ) {
  }
  // TODO here
  return operations;
};


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
    operations = operations.concat(_diff(input[key], output[key], ptr.add(key)));
  });
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
  // everything else must be wholesale replaced
  return [{op: 'replace', path: ptr.toString(), value: output}];
};

var diff = module.exports = function(input, output) {
  /** Produce a 'application/json-patch+json'-type patch to get from one object to another

  Returns list of operations to perform on `input` to produce `output`.
  */
  var ptr = new pointer.Pointer();
  return _diff(input, output, ptr);
};

var print_diff = function(input, output) {
  console.log('input:', input);
  console.log('output:', output);

  var ops = diff(input, output);

  var util = require('util');
  console.log('ops...');
  ops.forEach(function(op) {
    // var op_str = util.inspect(op, {depth: null});
    console.log(JSON.stringify(op, null, '  '));
  });
};

print_diff({level: 5, difficulty: 'hard'}, {level: 6, player: {name: 'chris'}});
