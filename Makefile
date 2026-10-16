PY := .venv/bin/python

.PHONY: all setup data etl export report clean

all: setup data etl export

setup:
	python3 -m venv .venv
	.venv/bin/pip install -r requirements.txt

data:
	$(PY) etl/extract.py

etl:
	$(PY) etl/transform.py

export:
	$(PY) etl/export.py

report:
	$(PY) -m http.server 8000 --directory report

clean:
	rm -f analytics.duckdb report/data.js
