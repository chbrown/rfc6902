/*globals exports, require */
var MissingError = exports.MissingError = function(path) {
  this.path = path;
};
MissingError.prototype.toString = function() {
  return 'Value required at path: ' + this.path;
};

var InvalidOperationError = exports.InvalidOperationError = function(op) {
  this.op = op;
};
InvalidOperationError.prototype.toString = function() {
  return 'Invalid operation: ' + this.op;
};

var TestError = exports.TestError = function(found, wanted) {
  this.found = found;
  this.wanted = wanted;
};
TestError.prototype.toString = function() {
  return 'Test failed: ' + this.found + ' != ' + this.wanted;
};
