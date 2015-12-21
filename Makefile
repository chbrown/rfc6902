BIN := node_modules/.bin
TYPESCRIPT := $(shell jq -r '.files[]' tsconfig.json | grep -v node_modules)
# JAVASCRIPT := $(TYPESCRIPT:%.ts=%.js)

all: rfc6902.js rfc6902.min.js

$(BIN)/browserify $(BIN)/mocha $(BIN)/tsc:
	npm install

%.js: %.ts $(BIN)/tsc
	$(BIN)/tsc

rfc6902.js: index.js diff.js equal.js errors.js patch.js pointer.js package.json $(BIN)/browserify
	$(BIN)/browserify $< --transform babelify --plugin derequire/plugin --standalone rfc6902 --outfile $@

%.min.js: %.js
	closure-compiler --language_in ECMASCRIPT5 --warning_level QUIET $< >$@

test: $(BIN)/mocha
	$(BIN)/mocha --compilers js:babel-core/register tests/
