'use strict'; /*jslint node: true, es5: true, indent: 2 */
var tap = require('tap');

var patch = require('../patch');
var diff = require('../diff');
var errors = require('../errors');

tap.test('require should substantiate', function(t) {
  t.ok(patch, 'patch should load from patch.js in parent directory');
  t.ok(diff, 'diff should load from diff.js in parent directory');
  t.ok(errors, 'errors should load from errors.js in parent directory');
  t.end();
});
