'use strict'; /*jslint node: true, es5: true, indent: 2 */

var unescape = function(token) {
  /** Unescape token part of a JSON Pointer string

  `token` should *not* contain any '/' characters.

  > Evaluation of each reference token begins by decoding any escaped
  > character sequence.  This is performed by first transforming any
  > occurrence of the sequence '~1' to '/', and then transforming any
  > occurrence of the sequence '~0' to '~'.  By performing the
  > substitutions in this order, an implementation avoids the error of
  > turning '~01' first into '~1' and then into '/', which would be
  > incorrect (the string '~01' correctly becomes '~1' after
  > transformation).
  */
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
};

var escape = function(token) {
  /** Escape token part of a JSON Pointer string

  > '~' needs to be encoded as '~0' and '/'
  > needs to be encoded as '~1' when these characters appear in a
  > reference token.

  This is the exact inverse of `unescape()`, so the reverse replacements must take place in reverse order.

  */
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
};

var at = exports.at = function(obj, pointer) {
  /** JSON Pointer (http://tools.ietf.org/html/rfc6901) resolver.

  `pointer` *must* be a string.

  Returns an object with 'parent', 'key', and 'value' properties.
  In the special case that pointer = "", parent and key will be null, and `value = obj`
  Otherwise, parent will be the such that `parent[key] == value`
  */
  var tokens = pointer.split('/').map(unescape);
  if (tokens[0] !== '') throw new Error('Invalid JSON Pointer: ' + pointer);

  var parent = null;
  var token = null;
  for (var i = 1, l = tokens.length; i < l; i++) {
    parent = obj;
    token = tokens[i];
    obj = parent[token];
  }
  return {
    parent: parent,
    key: token,
    value: obj,
  };
};
