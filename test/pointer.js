/*jslint node: true */
var fs = require('fs');
var path = require('path');

var tap = require('tap');
var yaml = require('js-yaml');

var pointer = require('../pointer');

tap.test('import', function(t) {
  t.ok(pointer, 'pointer should load from pointer.js in parent directory');

  t.end();
});

tap.test('rfc-examples', function(t) {
  // > For example, given the JSON document
  var obj = {
    'foo': ['bar', 'baz'],
    '': 0,
    'a/b': 1,
    'c%d': 2,
    'e^f': 3,
    'g|h': 4,
    'i\\j': 5,
    'k\'l': 6,
    ' ': 7,
    'm~n': 8
  };

  // > The following JSON strings evaluate to the accompanying values:
  var expectations = [
    {path: ''           , value: obj},
    {path: '/foo'       , value: ['bar', 'baz']},
    {path: '/foo/0'     , value: 'bar'},
    {path: '/'          , value: 0},
    {path: '/a~1b'      , value: 1},
    {path: '/c%d'       , value: 2},
    {path: '/e^f'       , value: 3},
    {path: '/g|h'       , value: 4},
    {path: '/i\\j'      , value: 5},
    {path: '/k\'l'      , value: 6},
    {path: '/ '         , value: 7},
    {path: '/m~0n'      , value: 8},
  ];

  expectations.forEach(function(expectation) {
    var endpoint = pointer.Pointer.parse(expectation.path).evaluate(obj);
    t.deepEqual(endpoint.value, expectation.value, 'resolved JSON Pointer should equal expected value');
  });

  t.end();
});

tap.test('deep', function(t) {
  var obj = {
    first: 'chris',
    last: 'brown',
    github: {
      account: {
        id: 'chbrown',
        handle: '@chbrown'
      },
      repos: [
        'amulet', 'twilight', 'rfc6902'
      ],
      stars: [
        {
          owner: 'raspberrypi',
          repo: 'userland'
        },
        {
          owner: 'angular',
          repo: 'angular.js'
        },
      ]
    },
    'github/account': 'deprecated'
  };

  // > The following JSON strings evaluate to the accompanying values:
  var expectations = [
    {path: '/first', value: 'chris'},
    {path: '/github~1account', value: 'deprecated'},
    {path: '/github/account/handle', value: '@chbrown'},
    {path: '/github/repos', value: ['amulet', 'twilight', 'rfc6902']},
    {path: '/github/repos/2', value: 'rfc6902'},
    {path: '/github/stars/0/repo', value: 'userland'},
  ];

  expectations.forEach(function(expectation) {
    var endpoint = pointer.Pointer.parse(expectation.path).evaluate(obj);
    t.deepEqual(endpoint.value, expectation.value, 'resolved JSON Pointer should equal expected value');
  });

  t.end();
});
