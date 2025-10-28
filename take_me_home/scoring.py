"""Scoring helpers that evaluate candidate travel plans."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

from .config import DEFAULT_WEIGHTS, ScoringWeights
from .models import FutureContext, TravelPlan


@dataclass(frozen=True)
class ScoreBreakdown:
    """Breaks a composite score into its component contributions."""

    total_score: float
    components: Dict[str, float]
    weights: ScoringWeights

    def component(self, name: str) -> float:
        """Retrieve a specific component score by name."""

        return self.components.get(name, 0.0)

    def as_dict(self) -> Dict[str, float]:
        """Serialize the breakdown into a plain dictionary."""

        return {**self.components, "total": self.total_score}


def _weather_adjustment(context: FutureContext, weights: ScoringWeights) -> float:
    weather = context.weather
    if not weather:
        return 0.0
    normalized = weather.normalized_severity()
    penalty = normalized * weather.expected_delay_minutes * weights.weather_disruption
    return penalty


def _reservation_adjustment(context: FutureContext, weights: ScoringWeights) -> float:
    reservation = context.reservation
    if not reservation:
        return 0.0
    pressure = reservation.normalized_pressure()
    penalty = pressure * weights.reservation_pressure
    return penalty


def score_plan(plan: TravelPlan, weights: Optional[ScoringWeights] = None) -> ScoreBreakdown:
    """Compute a composite score for the provided travel plan.

    Lower scores indicate a more desirable plan. The scoring system combines
    several heuristics so that future iterations can fine-tune the relative
    importance of each signal.
    """

    weights = weights or DEFAULT_WEIGHTS
    components: Dict[str, float] = {}

    components["total_travel_time"] = plan.total_travel_minutes * weights.total_travel_time
    components["driving_minutes"] = plan.total_driving_minutes * weights.driving_minutes
    components["ferry_risk"] = plan.ferry.risk * weights.ferry_risk

    weather_penalty = _weather_adjustment(plan.future_context, weights)
    reservation_penalty = _reservation_adjustment(plan.future_context, weights)

    if weather_penalty:
        components["weather_disruption"] = weather_penalty
    if reservation_penalty:
        components["reservation_pressure"] = reservation_penalty

    total = sum(components.values())
    return ScoreBreakdown(total_score=total, components=components, weights=weights)
