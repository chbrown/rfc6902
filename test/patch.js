'use strict'; /*jslint node: true, es5: true, indent: 2 */
// var os = require('os');
var fs = require('fs');
var path = require('path');

var tap = require('tap');
var yaml = require('js-yaml');

var rfc6902 = require('..');

tap.test('import', function(t) {
  t.ok(rfc6902, 'rfc6902 should load from parent directory');
  t.end();
});

tap.test('rfc', function(t) {
  var yaml_filepath = path.join(__dirname, 'rfc.yaml');
  fs.readFile(yaml_filepath, {encoding: 'utf8'}, function(err, data) {
    t.notOk(err, 'yaml read should not raise an error');

    var spec = yaml.load(data);
    spec.forEach(function(item) {
      // item has 'name', 'input', 'patch', and either an 'output' or 'error' properties
      t.ok(item.name && item.input && item.patch, true, 'each spec item should have name, input, and patch properties');
      t.test(item.name, function(t) {
        if (item.output) {
          var output = rfc6902.patch(item.input, item.patch);
          t.equal(output, item.output, 'patched input should equal expected output');
          // TODO: test diffing
        }
        else {
          t.equal(item.error, true, 'if output is not given, "error" should be true');
          t.throws(function() {
            var output = rfc6902.patch(item.input, item.patch);
          }, 'attempting patch should throw error');
        }
      });
    });
  });
});
