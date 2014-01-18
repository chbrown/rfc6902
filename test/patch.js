'use strict'; /*jslint node: true, es5: true, indent: 2 */
var fs = require('fs');
var path = require('path');

var tap = require('tap');
var yaml = require('js-yaml');

var patch = require('../patch');
var errors = require('../errors');

function identity(x) { return x; }

function keyOf(object, value) {
  /** Kind of convoluted way to get the name of a class from an object. */
  var keys = Object.keys(object);
  var values = keys.map(function(key) { return object[key]; });
  var index = values.indexOf(value);
  return keys[index];
}

tap.test('import', function(t) {
  t.ok(patch, 'patch should load from patch.js in parent directory');
  t.ok(errors, 'errors should load from errors.js in parent directory');
  t.end();
});

tap.test('rfc', function(t) {
  var yaml_filepath = path.join(__dirname, 'rfc.yaml');
  fs.readFile(yaml_filepath, {encoding: 'utf8'}, function(err, data) {
    t.notOk(err, 'yaml read should not throw an error');

    var spec = yaml.load(data);
    spec.forEach(function(item) {
      t.ok(item.name, 'each spec item should have a name');
      t.test(item.name, function(t) {
        // sanity-check spec
        var props = ['input', 'patch', 'output', 'errors'];
        props.forEach(function(prop) {
          t.ok(item.hasOwnProperty(prop), 'each spec item should have a "' + prop + '" property');
        });

        // perform patch and check result
        var object = item.input;
        // patch operations are applied to object in-place
        var results = patch(object, item.patch);
        var error_names = results.filter(identity).map(function(error) {
          return keyOf(errors, error.constructor);
        });
        // console.error('Got errors?', results, error_names);

        t.deepEqual(object, item.output, 'patched input should equal expected output');
        t.deepEqual(error_names, item.errors, 'any errors produced by patch() should be expected');
        // TODO: test diff
        t.end();
      });
    });
    t.end();
  });
});
