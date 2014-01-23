/*jslint node: true */
var fs = require('fs');
var async = require('async');
var uglify = require('uglify-js');

var modules = [
  'equal', // no deps
  'errors', // no deps
  'pointer', // no deps
  'diff', // depends on pointer, errors, equal
  'patch', // depends on pointer, errors, equal
];
async.map(modules, function(name, callback) {
  fs.readFile(name + '.js', {encoding: 'utf8'}, function(err, contents) {
    if (err) return callback(err);

    // var postfix = "})(typeof exports != 'undefined' ? exports : (this['" + name + "'] = {}));";
    var wrapped = "(function(exports) {" + contents + "})(this['" + name + "'] = {});";
    callback(null, wrapped);
  });
}, function(err, files) {
  if (err) {
    return console.error('async.map(wrap) failed:', err);
  }

  var header = "var require = function(name) { return this[name.split('/').slice(1).join('/')]; };";
  var concatenated = header + '\n' + files.join('\n');

  var builds = [
    {
      filename: 'rfc6902.js',
      contents: concatenated,
    },
    {
      filename: 'rfc6902.min.js',
      contents: uglify.minify(concatenated, {fromString: true}).code,
    },
  ];
  async.each(builds, function(build, callback) {
    console.error('writing %d bytes to %s', build.contents.length, build.filename);
    fs.writeFile(build.filename, build.contents, {encoding: 'utf8'}, callback);
  }, function(err) {
    console.error('done');
  });
});
