"""Route planning utilities that aggregate timing across candidate itineraries."""

from __future__ import annotations

from datetime import datetime
from typing import List

from .routes import build_candidate_routes
from .travel_time import Route, RouteResult, evaluate_route


class RoutePlanner:
    """Evaluate the SeaTac → Hood Canal Bridge trip using predefined routes."""

    def __init__(self, start_time: datetime) -> None:
        self.start_time = start_time
        self.routes: List[Route] = build_candidate_routes(start_time)

    def evaluate(self) -> List[RouteResult]:
        results = [evaluate_route(route, self.start_time) for route in self.routes]
        results.sort(key=lambda r: r.arrival)
        return results

    @staticmethod
    def describe(result: RouteResult) -> str:
        pieces = [
            f"Route: {result.route.name}",
            f"  depart: {result.departure:%Y-%m-%d %H:%M}",
            f"  arrive: {result.arrival:%Y-%m-%d %H:%M} (total {result.total_duration})",
        ]
        if result.waits:
            pieces.append(f"  total terminal waits: {result.waits}")
        for leg in result.legs:
            detail = f"    - {leg.name}: arrive {leg.arrival:%H:%M}"
            if leg.notes:
                detail += f" ({leg.notes})"
            pieces.append(detail)
        if result.slack_warnings:
            pieces.append("  ⚠ slack risks:")
            pieces.extend([f"    * {warning}" for warning in result.slack_warnings])
        return "\n".join(pieces)

    def summary(self) -> str:
        results = self.evaluate()
        return "\n\n".join(self.describe(res) for res in results)
