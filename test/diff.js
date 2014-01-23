/*jslint node: true */
var fs = require('fs');
var path = require('path');
var tap = require('tap');
var yaml = require('js-yaml');

var diff = require('../diff').diff;

tap.test('spec diff', function(t) {
  // we read this separately because patch is destructive and it's easier just to start with a blank slate
  fs.readFile('spec.yaml', {encoding: 'utf8'}, function(err, data) {
    // ignore spec items that are marked as not diffable
    yaml.load(data).filter(function(item) {
      return item.diffable;
    }).forEach(function(item) {
      t.test(item.name, function(t) {
        // perform diff (create patch = list of operations) and check result against non-test patches in spec
        var patch = diff(item.input, item.output);
        var expected_patch = item.patch.filter(function(operation) {
          return operation.op !== 'test';
        });
        // var results = patch(object, item.patch);
        t.deepEqual(patch, expected_patch, 'diff should produce patch equal to spec patch');
        t.end();
      });
    });
    t.end();
  });
});
