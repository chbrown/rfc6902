BIN := node_modules/.bin

all: bundle.js site.css

$(BIN)/lessc $(BIN)/cleancss $(BIN)/browserify:
	npm install

%.css: %.less $(BIN)/lessc $(BIN)/cleancss
	$(BIN)/lessc $< | $(BIN)/cleancss --keep-line-breaks --skip-advanced -o $@

bundle.min.js: bundle.js
	closure-compiler --language_in ECMASCRIPT5 --warning_level QUIET <$< >$@

bundle.js: app.js $(BIN)/browserify
	$(BIN)/browserify $< --transform babelify --outfile $@
