"""Core interfaces for the take_me_home travel planning toolkit."""

from .config import ScoringWeights
from .models import (
    FerryOption,
    FutureContext,
    ReservationAvailability,
    TravelPlan,
    WeatherDisruption,
)
from .scoring import ScoreBreakdown, score_plan
from .explain import build_explanation

__all__ = [
    "ScoringWeights",
    "FerryOption",
    "TravelPlan",
    "FutureContext",
    "WeatherDisruption",
    "ReservationAvailability",
    "ScoreBreakdown",
    "score_plan",
    "build_explanation",
]
