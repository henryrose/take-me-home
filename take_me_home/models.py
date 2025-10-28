"""Domain models that describe ferries, travel plans, and future extensions."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional


@dataclass(frozen=True)
class FerryOption:
    """Metadata about a ferry sailing that can be incorporated into a plan."""

    name: str
    departure: datetime
    arrival: datetime
    risk: float
    buffer_minutes: int = 0
    notes: Optional[str] = None

    def __post_init__(self) -> None:
        if self.arrival <= self.departure:
            raise ValueError("Ferry arrival time must be after departure time")
        if not 0.0 <= self.risk <= 1.0:
            raise ValueError("Ferry risk must be between 0 and 1")
        if self.buffer_minutes < 0:
            raise ValueError("Buffer minutes cannot be negative")

    @property
    def duration_minutes(self) -> int:
        """Duration of the sailing expressed in whole minutes."""

        return int((self.arrival - self.departure).total_seconds() // 60)


@dataclass(frozen=True)
class WeatherDisruption:
    """Placeholder for weather related signals."""

    severity: int
    expected_delay_minutes: int = 0
    description: Optional[str] = None

    def normalized_severity(self) -> float:
        """Normalize severity on a 0..1 scale for scoring adjustments."""

        return max(0.0, min(1.0, self.severity / 10))


@dataclass(frozen=True)
class ReservationAvailability:
    """Represents the known reservation status for a sailing."""

    status: str
    confidence: float
    notes: Optional[str] = None

    def normalized_pressure(self) -> float:
        """Return a 0..1 urgency score for limited reservations."""

        status_value = {
            "available": 0.0,
            "limited": 0.5,
            "waitlist": 0.75,
            "sold_out": 1.0,
        }.get(self.status.lower(), 0.0)
        return max(status_value, min(1.0, self.confidence))


@dataclass(frozen=True)
class FutureContext:
    """Container for future extensibility hooks."""

    weather: Optional[WeatherDisruption] = None
    reservation: Optional[ReservationAvailability] = None
    notes: Optional[str] = None


@dataclass(frozen=True)
class TravelPlan:
    """Aggregates the key details for a door-to-door travel scenario."""

    driving_minutes_pre: int
    driving_minutes_post: int
    ferry: FerryOption
    prep_buffer_minutes: int = 0
    arrival_buffer_minutes: int = 0
    future_context: FutureContext = field(default_factory=FutureContext)

    def __post_init__(self) -> None:
        for field_name in ("driving_minutes_pre", "driving_minutes_post", "prep_buffer_minutes", "arrival_buffer_minutes"):
            value = getattr(self, field_name)
            if value < 0:
                raise ValueError(f"{field_name} cannot be negative")

    @property
    def total_driving_minutes(self) -> int:
        return self.driving_minutes_pre + self.driving_minutes_post

    @property
    def total_buffer_minutes(self) -> int:
        return self.prep_buffer_minutes + self.arrival_buffer_minutes + self.ferry.buffer_minutes

    @property
    def total_travel_minutes(self) -> int:
        return (
            self.total_driving_minutes
            + self.ferry.duration_minutes
            + self.total_buffer_minutes
        )

    @property
    def estimated_arrival(self) -> datetime:
        """Estimated door-to-door arrival time."""

        post_drive = timedelta(minutes=self.driving_minutes_post + self.arrival_buffer_minutes)
        return self.ferry.arrival + post_drive

    @property
    def departure_time(self) -> datetime:
        """Door departure time accounting for prep buffers."""

        pre_drive = timedelta(minutes=self.driving_minutes_pre + self.prep_buffer_minutes + self.ferry.buffer_minutes)
        return self.ferry.departure - pre_drive
