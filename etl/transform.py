"""Transform: staging -> cleaned layer -> star schema -> marketing marts.

Everything runs as SQL inside DuckDB. Re-running the script rebuilds all
layers from stg_raw, so the transform is idempotent.
"""
import sys
from pathlib import Path

import duckdb

DB_PATH = "analytics.duckdb"
SQL_DIR = Path(__file__).parent.parent / "sql"

# Order matters: each file builds objects the next ones reference.
STEPS = [
    "01_clean.sql",
    "02_dimensions.sql",
    "03_facts.sql",
    "04_marts.sql",
]


def main() -> None:
    conn = duckdb.connect(DB_PATH)
    try:
        for step in STEPS:
            script = (SQL_DIR / step).read_text()
            print(f"[transform] running {step} ...")
            conn.execute(script)
        tables = conn.execute(
            """
            SELECT table_name, estimated_size
            FROM duckdb_tables() WHERE schema_name = 'main'
            ORDER BY table_name
            """
        ).fetchall()
        print("[transform] schema after run:")
        for name, size in tables:
            print(f"  {name:<24} {size:>12,} rows")
    finally:
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
