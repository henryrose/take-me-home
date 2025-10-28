"""Command-line entry point for evaluating SeaTac → Hood Canal Bridge routes."""

from __future__ import annotations

from datetime import datetime
import pathlib
import sys

# Ensure the project package is importable when the script is executed directly.
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from take_me_home.planner import RoutePlanner


def main() -> None:
    start_time = datetime(2025, 6, 1, 14, 5)
    planner = RoutePlanner(start_time=start_time)
    print(planner.summary())


if __name__ == "__main__":
    main()
