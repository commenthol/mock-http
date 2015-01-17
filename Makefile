all: _doc v0.10 v0.11 v0.8

_doc:
	@ apidox -i index.js -o ./doc/index.js.md; \
	cd lib && \
	for f in $$(ls *.js); do \
		echo $$f; \
		apidox -i $$f -o ../doc/$$f.md; \
	done;

_readme:
	@ markedpp README.md > o.md; \
	mv o.md README.md;

v0.8:
	n 0.8
	npm test

v0.10:
	n 0.10
	npm test

v0.11:
	n 0.11
	npm test
