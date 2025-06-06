all: build

tidy:
	rm -f *:Zone.Identifier icons/*:Zone.Identifier

build: tidy
	web-ext lint
	web-ext build --overwrite-dest

test: build
	web-ext run --devtools --browser-console

.PHONY: all
