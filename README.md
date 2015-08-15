# rfc6902

Complete implementation of [RFC6902](http://tools.ietf.org/html/rfc6902) "JavaScript Object Notation (JSON) Patch"
(including [RFC6901](http://tools.ietf.org/html/rfc6901) "JavaScript Object Notation (JSON) Pointer"),
for creating and consuming `application/json-patch+json` documents. Also offers "diff" functionality without using `Object.observe`.

**Important news!** `v1.0.2`, published on **2015**-06-09, renames a few of the public API methods from `v0.0.6`, the previous version, which was published on **2014**-01-23.

| `v0.0.6` name                       | `v1.0.2` equivalent                  |
|:------------------------------------|:-------------------------------------|
| `rfc6902.patch(object, operations)` | `rfc6902.applyPatch(object, patch)`  |
| `rfc6902.diff(input, output)`       | `rfc6902.createPatch(input, output)` |

The arguments and return values are unchanged, except that the list of operation results returned by `rfc6902.applyPatch()` contains `null` (in `v1.0.2`) for each successful operation, instead of `undefined` (which was `v0.0.6` behavior).

The old names are currently aliased to the new names, but will print a deprecation warning via `console.error()`.

See [API](#api) below for details.


## Quickstart

    npm install --save rfc6902

In your script:

    var rfc6902 = require('rfc6902');

Calculate diff between two objects:

    rfc6902.createPatch({first: 'Chris'}, {first: 'Chris', last: 'Brown'});

> `[ { op: 'add', path: '/last', value: 'Brown' } ]`

Apply a patch to some object.

    var users = [{first: 'Chris', last: 'Brown', age: 20}];
    rfc6902.applyPatch(users, [
      {op: 'replace', path: '/0/age', value: 21},
      {op: 'add', path: '/-', value: {first: 'Raphael', age: 37}},
    ]);

Now the value of `users` is:

> `[ { first: 'Chris', last: 'Brown', age: 21 },`
> `  { first: 'Raphael', age: 37 } ]`


# API

`rfc6902` exposes two methods. (I'm using TypeScript-like type annotations here.)

* `rfc6902.applyPatch(object: any, patch: Operation[]): Array<Error | null>`

  The operations in `patch` are applied to `object` in-place, and it returns a list of results. The returned list will have the same length as `patch`. If all operations were successful, each item in the returned list will be `null`. If any of them failed, the corresponding item in the returned list will be an Error instance with descriptive `.name` and `.message` properties.
* `rfc6902.createPatch(input: any, output: any): Operation[]`

  Returns a list of operations (a JSON Patch) of the required operations to make `input` equal to `output`. In most cases, there is more than one way to transform an object into another. This method is more efficient than wholesale replacement, but does not always provide the optimal list of patches. It uses a simple Levenshtein-type implementation with Arrays, but it doesn't try for anything much smarter than that, so it's limited to `remove`, `add`, and `replace` operations.
* `interface Operation { op: string; from?: string; path?: string; value?: string; }`


## Demo

Simple [web app](https://chbrown.github.io/rfc6902) using the browser-compiled version of the code.

* Currently only demos `createPatch(input, output)` functionality.


## Determinism

If you've ever implemented Levenshtein's algorithm,
or played tricks with `git stash` to get a reasonable sequence of commits,
you'll realize that computing diffs is rarely deterministic.
(This explains why 2 out of the 103 tests are currently failing.)

Applying `json-patch` documents is way easier than generating them,
which might explain why there are more than five patch-applying RFC6902 implementations in NPM,
but only one (this one) that attempts to generate patch documents from two distinct objects (there's one that uses `Object.observe()`, which is cheating, and only works when you're the one making the changes).

So when comparing _your_ data objects, you'll want to ensure that the patches it generates meet your needs.
The algorithm used by this library is not optimal, but it's more efficient than the strategy of wholesale replacing everything that's not an exact match.

Of course, this only applies to generating the patches.
Applying them is deterministic and completely specified by [RFC6902](http://tools.ietf.org/html/rfc6902).


# Tutorial

## JSON Pointer (RFC6901)

The [RFC](http://tools.ietf.org/html/rfc6901) is a quick and easy read, but here's the gist:

* JSON Pointer is a system for pointing to some fragment of a JSON document.
* A pointer is a string that is composed of zero or more <code>/<i>reference-token</i></code> parts.
  - When there are zero (the empty string), the pointer indicates the entire JSON document.
  - Otherwise, the parts are read from left to right, each one selecting part of the current document, and presenting only that fragment of the document to the next part.
* The <code><i>reference-token</i></code> bits are usually Object keys, but may also be decimals, to indicate array indices.

E.g., consider the NPM registry:

    {
      "_updated": 1417985649051,
      "flickr-with-uploads": {
        "name": "flickr-with-uploads",
        "description": "Flickr API with OAuth 1.0A and uploads",
        "repository": {
          "type": "git",
          "url": "git://github.com/chbrown/flickr-with-uploads.git"
        },
        "homepage": "https://github.com/chbrown/flickr-with-uploads",
        "keywords": [
          "flickr",
          "api",
          "backup"
        ],
        ...
      },
      ...
    }

1. `/_updated`: this selects the value of that key, which is just a number: `1417985649051`
2. `/flickr-with-uploads`: This selects the entire object:

        {
          "name": "flickr-with-uploads",
          "description": "Flickr API with OAuth 1.0A and uploads",
          "repository": {
            "type": "git",
            "url": "git://github.com/chbrown/flickr-with-uploads.git"
          },
          "homepage": "https://github.com/chbrown/flickr-with-uploads",
          "keywords": [
            "flickr",
            "api",
            "backup"
          ],
          ...
        }
3. `/flickr-with-uploads/name`: this effectively applies the `/name` pointer to the result of the previous item, which selects the string, `"flickr-with-uploads"`.
4. `/flickr-with-uploads/keywords/1`: Array indices start at 0, so this selects the second item from the `keywords` array, namely, `"api"`.

**Rules:**

* A pointer, if it is not empty, must always start with a slash; otherwise, it is an "Invalid pointer syntax" error.
* If a key within the JSON document contains a forward slash character (which is totally valid JSON, but not very nice), the `/` in the desired key should be replaced by the escape sequence, `~1`.
* If a key within the JSON document contains a tilde (again valid JSON, but not very common), the `~` should be replaced by the other escape sequence, `~0`. This allows keys containing the literal string `~1` (which is especially cruel) to be referenced by a JSON pointer (e.g., `/~01` should return `true` when applied to the object `{"~1":true}`).
* All double quotation marks, reverse slashes, and control characters _must_ escaped, since a JSON Pointer is a JSON string.
* A pointer that refers to a non-existent value counts as an error, too. But not necessarily as fatal as a syntax error.

## JSON Patch (RFC6902)

The [RFC](http://tools.ietf.org/html/rfc6902) is only 18 pages long, and pretty straightforward, but here are the basics.

A JSON Patch document is a JSON document such that:

* The MIME Type is `application/json-patch+json`
* The file extension is `.json-patch`
* It is an array of patch objects, potentially empty.
* Each patch object has a key, `op`, with one of the following values, and an operator-specific set of other keys.
  - **`add`**: Insert the given `value` at `path`. Or replace it, if it already exists. If the parent of the intended target does not exist, produce an error. If the final reference-token of `path` is "`-`", and the parent is an array, append `value` to it.
    + `path`: JSON Pointer
    + `value`: JSON object
  - **`remove`**: Remove the value at `path`. Produces an error if it does not exist. If `path` refers to an element within an array, splice it out, so that subsequent elements fill in the gap, and the length of the array is decremented by 1.
    + `path`: JSON Pointer
  - **`replace`**: Replace the current value at `path` with `value`; it's exactly the same as performing a `remove` operation and then an `add` operation, since there _must_ be a pre-existing value.
    + `path`: JSON Pointer
    + `value`: JSON object
  - **`move`**: Remove the value at `from`, and set `path` to that value. There _must_ be a value at `from`, but not necessarily at `path`; it's the same as performing a `remove` operation, and then an `add` operation.
    + `from`: JSON Pointer
    + `path`: JSON Pointer
  - **`copy`**: Get the value at `from` and set `path` to that value. Same as `move`, but don't remove the original value.
    + `from`: JSON Pointer
    + `path`: JSON Pointer
  - **`test`**: Check that the value at `path` is equal to `value`. If it is not, the entire patch is considered to be a failure.
    + `path`: JSON Pointer
    + `value`: JSON object


## License

Copyright 2014-2015 Christopher Brown. [MIT Licensed](http://opensource.org/licenses/MIT).
