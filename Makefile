BIN := node_modules/.bin

all: dist.js

$(BIN)/browserify $(BIN)/mocha:
	npm install

dist.js: index.js diff.js equal.js errors.js patch.js pointer.js $(BIN)/browserify
	$(BIN)/browserify $< --transform babelify --standalone rfc6902 --outfile $@

.PHONY: test
test: $(BIN)/mocha
	$(BIN)/mocha --compilers js:babel/register test/
