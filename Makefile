BIN := node_modules/.bin

all: bundle.js site.css img/favicon.ico

$(BIN)/lessc $(BIN)/cleancss $(BIN)/browserify:
	npm install

%.css: %.less $(BIN)/lessc $(BIN)/cleancss
	$(BIN)/lessc $< | $(BIN)/cleancss --keep-line-breaks --skip-advanced -o $@

bundle.min.js: bundle.js
	closure-compiler --language_in ECMASCRIPT5 --warning_level QUIET <$< >$@

bundle.js: app.js $(BIN)/browserify
	$(BIN)/browserify $< --transform babelify --outfile $@

.INTERMEDIATE: img/favicon-16.png img/favicon-32.png
img/favicon-%.png: img/favicon.psd
	convert $<[0] -resize $*x$* $@ # [0] pulls off the composited layer from the original PSD
img/favicon.ico: img/favicon-16.png img/favicon-32.png
	convert $^ $@
