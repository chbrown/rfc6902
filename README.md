# rfc6902

Complete implementation of [RFC6902](http://tools.ietf.org/html/rfc6902)
(including [RFC6901](http://tools.ietf.org/html/rfc6901)),
for creating and consuming `application/json-patch+json` documents.

No fancy Object.observe, no TypeScript, no missing "diff" function.


## Demo

Simple [web app](http://chbrown.github.io/rfc6902) using the browser-compiled version of the code.

* Currently only demos `diff(input, output)` functionality.


## Determinism

If you've ever implemented Levenshtein's algorithm,
or played tricks with `git stash` to get a reasonable sequence of commits,
you'll realize that computing diffs is rarely deterministic.
(This explains why 2 out of the 94 tests are currently failing.)

Applying `json-patch` documents is way easier than generating them,
which might explain why there are more than five patch-applying RFC6902 implementations in NPM,
but only one (_yours truly_) that attempts to generate patch documents from two distinct objects.

So when comparing _your_ data objects, you'll want to ensure that the patches it generates meet your needs.

Of course, this only applies to generating the patches.
Applying them is deterministic and completely specified by [RFC6902](http://tools.ietf.org/html/rfc6902).


## Installation

**From npm:**

```sh
npm install rfc6902
```

**Or github:**

```sh
git clone https://github.com/chbrown/rfc6902.git
cd rfc6902
npm install -g
```

**Import:**

```js
var rfc6902 = require('rfc6902');
```


## License

Copyright © 2014 Christopher Brown. [MIT Licensed](LICENSE).
