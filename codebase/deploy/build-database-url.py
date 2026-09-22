#!/usr/bin/env python3
"""Build a SQLAlchemy asyncpg DATABASE_URL with a correctly encoded password."""
from __future__ import annotations

import sys
from urllib.parse import quote_plus


def main() -> int:
    if len(sys.argv) != 6:
        print(
            "usage: build-database-url.py USER PASSWORD HOST PORT DATABASE",
            file=sys.stderr,
        )
        return 2
    user, password, host, port, database = sys.argv[1:6]
    url = (
        f"postgresql+asyncpg://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{quote_plus(database)}"
    )
    print(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
