all: static/site.css

%.css: %.less
	lessc $+ | cleancss --keep-line-breaks --skip-advanced -o $@
