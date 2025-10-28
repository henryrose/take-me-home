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
"""Top-level exports for the take_me_home travel-time toolkit."""

from .planner import RoutePlanner
from .routes import build_candidate_routes
from .travel_time import (
    DriveLeg,
    FerryLeg,
    FerrySailingOption,
    LegResult,
    Route,
    RouteResult,
    TravelLeg,
    evaluate_route,
)

__all__ = [
    "DriveLeg",
    "FerryLeg",
    "FerrySailingOption",
    "LegResult",
    "Route",
    "RoutePlanner",
    "RouteResult",
    "TravelLeg",
    "build_candidate_routes",
    "evaluate_route",
]
