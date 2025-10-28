"""Travel time modeling primitives for the take_me_home project."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import List, Optional, Sequence


@dataclass(frozen=True)
class LegResult:
    """Outcome of traversing a travel leg."""

    name: str
    departure: datetime
    arrival: datetime
    duration: timedelta
    wait: timedelta = timedelta(0)
    slack: Optional[timedelta] = None
    risk: Optional[str] = None
    notes: Optional[str] = None


@dataclass(frozen=True)
class TravelLeg:
    """Base travel leg."""

    name: str

    def traverse(self, start: datetime) -> LegResult:
        raise NotImplementedError


@dataclass(frozen=True)
class DriveLeg(TravelLeg):
    """Drive segment with a fixed travel time estimate."""

    duration: timedelta
    conditions: str = "typical"

    def traverse(self, start: datetime) -> LegResult:
        arrival = start + self.duration
        notes = f"{self.conditions} traffic assumption"
        return LegResult(
            name=self.name,
            departure=start,
            arrival=arrival,
            duration=self.duration,
            notes=notes,
        )


@dataclass(frozen=True)
class FerrySailingOption:
    """Candidate ferry sailing and its alignment metadata."""

    departure: datetime
    wait: timedelta
    slack: timedelta
    risk: str


@dataclass(frozen=True)
class FerryLeg(TravelLeg):
    """Ferry segment backed by an explicit sailing schedule."""

    sailings: Sequence[datetime]
    crossing: timedelta
    loading_cutoff: timedelta
    buffer: timedelta = timedelta(minutes=5)
    label: str = "Ferry"

    def _classify_risk(self, slack: timedelta) -> str:
        tight_threshold = self.buffer + timedelta(minutes=5)
        comfortable_threshold = self.buffer + timedelta(minutes=15)
        if slack <= self.buffer:
            return "critical"
        if slack <= tight_threshold:
            return "tight"
        if slack <= comfortable_threshold:
            return "moderate"
        return "comfortable"

    def viable_sailings(self, arrival: datetime) -> List[FerrySailingOption]:
        options: List[FerrySailingOption] = []
        for departure in sorted(self.sailings):
            latest_arrival = departure - self.loading_cutoff
            slack = latest_arrival - arrival
            if slack < self.buffer:
                continue
            wait = max(timedelta(0), departure - arrival)
            options.append(
                FerrySailingOption(
                    departure=departure,
                    wait=wait,
                    slack=slack,
                    risk=self._classify_risk(slack),
                )
            )
        return options

    def traverse(self, start: datetime) -> LegResult:
        options = self.viable_sailings(start)
        if not options:
            raise ValueError(
                f"No viable ferry sailings for {self.name} when arriving at {start.isoformat()}"
            )
        choice = options[0]
        arrival = choice.departure + self.crossing
        notes = (
            f"{self.label} departure {choice.departure:%H:%M}; wait {choice.wait}"
            f"; slack {choice.slack} ({choice.risk})"
        )
        return LegResult(
            name=self.name,
            departure=start,
            arrival=arrival,
            duration=self.crossing,
            wait=choice.wait,
            slack=choice.slack,
            risk=choice.risk,
            notes=notes,
        )


@dataclass(frozen=True)
class Route:
    """Collection of legs representing a candidate itinerary."""

    name: str
    legs: Sequence[TravelLeg]


@dataclass(frozen=True)
class RouteResult:
    """Aggregate result for a route evaluation."""

    route: Route
    legs: Sequence[LegResult]
    departure: datetime
    arrival: datetime
    total_duration: timedelta
    waits: timedelta = field(default=timedelta(0))

    @property
    def slack_warnings(self) -> List[str]:
        warnings: List[str] = []
        for leg in self.legs:
            if leg.slack is not None and leg.risk in {"critical", "tight"}:
                warnings.append(
                    f"{leg.name} slack {leg.slack} classified as {leg.risk}"
                )
        return warnings


def evaluate_route(route: Route, start: datetime) -> RouteResult:
    """Evaluate a route and compute aggregate timing metrics."""

    leg_results: List[LegResult] = []
    cursor = start
    waits = timedelta(0)
    for leg in route.legs:
        result = leg.traverse(cursor)
        leg_results.append(result)
        waits += result.wait
        cursor = result.arrival
    total_duration = cursor - start
    return RouteResult(
        route=route,
        legs=tuple(leg_results),
        departure=start,
        arrival=cursor,
        total_duration=total_duration,
        waits=waits,
    )
