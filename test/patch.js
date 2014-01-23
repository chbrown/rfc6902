/*jslint node: true */
var fs = require('fs');
var path = require('path');
var tap = require('tap');
var yaml = require('js-yaml');

var errors = require('../errors');

function keyOf(object, value) {
  /** Kind of convoluted way to get the name of a class from an object. */
  var keys = Object.keys(object);
  var values = keys.map(function(key) { return object[key]; });
  var index = values.indexOf(value);
  return keys[index];
}

var patch = require('../patch').patch;

tap.test('spec patch', function(t) {
  fs.readFile('spec.yaml', {encoding: 'utf8'}, function(err, data) {
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
