_FILES=mahjong primitives/player primitives/tile
_TESTS=mahjong primitives/player primitives/tile
_DEPS=underscore/underscore backbone/backbone mocha/mocha chai/chai

SRC=src
OUT=out
TST=tst
VND=vnd
SPEC=spec

DEP=$(patsubst %, node_modules/%.js, $(_DEPS))
FILES=$(patsubst %, $(SRC)/%.coffee, $(_FILES))
TESTS=$(patsubst %, $(SPEC)/%_spec.coffee, $(_TESTS))

MOCHA_CSS=$(patsubst %, $(OUT)/%.css, $(VND)/mocha)
MOCHA=$(patsubst %, $(OUT)/%.js, $(VND)/mocha)
CHAI=$(patsubst %, $(OUT)/%.js, $(VND)/chai)
JQUERY=$(patsubst %, $(OUT)/%.js, $(VND)/jquery)
BACKBONE=$(patsubst %, $(OUT)/%.js, $(VND)/backbone)
UNDERSCORE=$(patsubst %, $(OUT)/%.js, $(VND)/underscore)

.PHONY: test production vendor_files project_files test_files

test: vendor_files $(OUT)/coffee_spec.js
	@echo "Open the out/test_build.html file to test"
	@echo "Be sure to update the test_build.html file if you've put in more stuff!!"

$(OUT)/coffee_spec.js: $(OUT)/coffee_spec.coffee
	@coffee -co $(OUT)/ $^

$(OUT)/coffee_spec.coffee: $(FILES) $(TESTS) Cakefile
	@cake tests

project_files: $(FILES)
	@echo "Finished compiling all your source files and dumped into the out/src directory"

$(OUT)/$(SRC)/%.js: %(SRC)/%.coffee
	@coffee -b -co $(OUT)/$(SRC)/ $^

test_files: $(TESTS)
	@echo "Finished compiling all your test files and dumped into the out/tst directory"

$(OUT)/$(TST)/%.js: %(TST)/%.coffee
	@coffee -b -co $(OUT)/$(TST)/ $^

vendor_files: $(MOCHA) $(BACKBONE) $(UNDERSCORE)
	@echo "Moved vendor files into the out/vnd directory"

$(MOCHA_CSS): node_modules/mocha/mocha.css
	@cp $< $@ -f

$(MOCHA): node_modules/mocha/mocha.js $(MOCHA_CSS)
	cp $< $@ -f

$(BACKBONE): node_modules/backbone/backbone.js
	cp $^ $@ -f

$(UNDERSCORE): node_modules/underscore/underscore.js
	cp $^ $@ -f

