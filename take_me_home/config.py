"""Configuration objects for scoring and planning heuristics."""

from __future__ import annotations

from dataclasses import dataclass, fields, replace
from typing import Any, Dict


@dataclass(frozen=True)
class ScoringWeights:
    """Weights used for computing the desirability of a travel plan.

    Attributes
    ----------
    total_travel_time:
        Weight applied to the overall end-to-end travel time in minutes.
    driving_minutes:
        Weight applied to door-to-door driving time. This allows planners to
        nudge scoring toward routes that keep driving to a minimum even when the
        total trip time is similar across options.
    ferry_risk:
        Weight applied to qualitative risk associated with the selected ferry.
        This can capture the historical reliability of the route as well as
        disruptions such as maintenance or crew shortages.
    weather_disruption:
        Optional weight for future use when factoring weather forecasts into
        plan scoring. Defaults to zero until those signals are implemented.
    reservation_pressure:
        Optional weight used to steer travelers toward sailings that still have
        reservations available.
    """

    total_travel_time: float = 0.6
    driving_minutes: float = 0.3
    ferry_risk: float = 0.1
    weather_disruption: float = 0.0
    reservation_pressure: float = 0.0

    def tuned(self, **overrides: Any) -> "ScoringWeights":
        """Create a modified copy with updated weights.

        Parameters
        ----------
        overrides:
            Keyword arguments that match the dataclass fields. Any missing
            values default to the current instance, enabling callers to adjust
            weights incrementally as they experiment with different heuristics.

        Returns
        -------
        ScoringWeights
            A new dataclass instance reflecting the requested changes.

        Raises
        ------
        ValueError
            If a provided key does not correspond to a known weight name.
        """

        valid_names = {f.name for f in fields(self)}
        unexpected = set(overrides) - valid_names
        if unexpected:
            invalid = ", ".join(sorted(unexpected))
            raise ValueError(f"Unknown scoring weights: {invalid}")
        return replace(self, **overrides)

    def to_dict(self) -> Dict[str, float]:
        """Expose the weights as a plain dictionary for serialization."""

        return {f.name: getattr(self, f.name) for f in fields(self)}


DEFAULT_WEIGHTS = ScoringWeights()
"""Module-level default weights shared by the scoring helpers."""
