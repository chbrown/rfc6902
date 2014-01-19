'use strict'; /*jslint node: true, es5: true, indent: 2 */
var fs = require('fs');
var path = require('path');
var tap = require('tap');
var yaml = require('js-yaml');

var patch = require('../patch');
var errors = require('../errors');

// a few helpers:

function keyOf(object, value) {
  /** Kind of convoluted way to get the name of a class from an object. */
  var keys = Object.keys(object);
  var values = keys.map(function(key) { return object[key]; });
  var index = values.indexOf(value);
  return keys[index];
}

// test logistics:

var spec_filepath = path.join(__dirname, 'spec.yaml');

tap.test('rfc spec', function(t) {
  fs.readFile(spec_filepath, {encoding: 'utf8'}, function(err, data) {
    t.notOk(err, 'yaml read should not throw an error');

    var spec = yaml.load(data);

    // sanity-check spec
    var props = ['name', 'input', 'patch', 'output', 'errors'];
    var props_csv = props.join(', ');
    spec.forEach(function(item) {
      t.deepEqual(Object.keys(item), props, 'each spec item should have properties: ' + props_csv);
    });
    t.end();
  });
});

// patch

tap.test('rfc patch', function(t) {
  fs.readFile(spec_filepath, {encoding: 'utf8'}, function(err, data) {
    yaml.load(data).forEach(function(item) {
      t.test(item.name, function(t) {
        // perform patch and check result
        var object = item.input;
        // patch operations are applied to object in-place
        var results = patch(object, item.patch);
        var error_names = results.filter(function(x) { return x; }).map(function(error) {
          return keyOf(errors, error.constructor);
        });
        t.deepEqual(object, item.output, 'patched input should equal expected output');
        t.deepEqual(error_names, item.errors, 'any errors produced by patch() should be expected');

        t.end();
      });
    });
    t.end();
  });
});
