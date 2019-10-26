all: v8. v10. v12. v13.

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
