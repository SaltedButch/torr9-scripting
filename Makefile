PYTHON ?= python3

.PHONY: build check clean list bump release

build:
	$(PYTHON) tools/build_userscripts.py

check:
	$(PYTHON) tools/build_userscripts.py --check

clean:
	rm -rf dist

list:
	$(PYTHON) tools/build_userscripts.py --list

bump:
ifndef SCRIPT
	$(error SCRIPT is required, for example: make bump SCRIPT=blacklist-shoutbox VERSION=2.16.0)
endif
ifndef VERSION
	$(error VERSION is required, for example: make bump SCRIPT=blacklist-shoutbox VERSION=2.16.0)
endif
	$(PYTHON) tools/bump_version.py $(SCRIPT) $(VERSION)

release: bump build
