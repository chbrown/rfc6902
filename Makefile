BIN := node_modules/.bin

all: bundle.js bundle.min.js site.css

$(BIN)/watsh $(BIN)/lessc $(BIN)/cleancss $(BIN)/browserify $(BIN)/watchify:
	npm install

%.css: %.less $(BIN)/lessc $(BIN)/cleancss
	$(BIN)/lessc $< | $(BIN)/cleancss --keep-line-breaks --skip-advanced -o $@

%.min.js: %.js
	closure-compiler --angular_pass --language_in ECMASCRIPT5 --warning_level QUIET $< >$@

bundle.js: app.js $(BIN)/browserify
	$(BIN)/browserify $< -t babelify -t browserify-ngannotate -o $@

dev: $(BIN)/watsh $(BIN)/watchify
	(\
    $(BIN)/watsh 'make site.css' site.less & \
    $(BIN)/watchify app.js -t babelify -t browserify-ngannotate -o bundle.js -v & \
    wait)
