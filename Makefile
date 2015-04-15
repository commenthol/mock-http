all: v0.8 v0.10 v0.12

doc:
	@npm run doc

readme:
	@markedpp README.md > tmp.md; \
	mv tmp.md README.md;

clean:
	@rm -rf doc coverage

v%:
	n $@
	npm test

.PHONY: all doc clean