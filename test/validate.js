/*jslint node: true */
var fs = require('fs');
var tap = require('tap');
var yaml = require('js-yaml');

var errors = require('../errors');

tap.test('proper spec', function(t) {
  fs.readFile('spec.yaml', {encoding: 'utf8'}, function(err, data) {
    t.notOk(err, 'yaml read should not throw an error');

    var spec = yaml.load(data);

    // use sorted values and sort() to emulate set equality
    var props = ['diffable', 'errors', 'input', 'name', 'output', 'patch'];
    var props_csv = props.join(', ');
    spec.forEach(function(item) {
      t.deepEqual(Object.keys(item).sort(), props, 'each spec item should have properties: ' + props_csv);
    });
    t.end();
  });
});
