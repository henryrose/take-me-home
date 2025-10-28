"""Route definitions and helpers for the take_me_home project."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Sequence

from .travel_time import DriveLeg, FerryLeg, Route


def _schedule(anchor: datetime, hhmm: Sequence[str]) -> List[datetime]:
    """Construct datetime objects on the anchor date for HH:MM entries."""
    return [anchor.replace(hour=int(t[:2]), minute=int(t[3:]), second=0, microsecond=0) for t in hhmm]


def build_candidate_routes(anchor: datetime) -> List[Route]:
    """Create the three candidate routes for the SeaTac → Hood Canal Bridge trip."""

    edmonds_sailings = _schedule(
        anchor,
        ["15:10", "15:40", "16:10", "16:40", "17:10"],
    )
    bainbridge_sailings = _schedule(
        anchor,
        ["15:25", "15:55", "16:25", "16:55", "17:25"],
    )

    return [
        Route(
            name="Edmonds → Kingston",
            legs=(
                DriveLeg(
                    name="SeaTac to Edmonds terminal",
                    duration=timedelta(minutes=47),
                    conditions="afternoon congestion",
                ),
                FerryLeg(
                    name="Edmonds–Kingston ferry",
                    sailings=edmonds_sailings,
                    crossing=timedelta(minutes=32),
                    loading_cutoff=timedelta(minutes=20),
                    buffer=timedelta(minutes=7),
                    label="WSF Edmonds–Kingston",
                ),
                DriveLeg(
                    name="Kingston to Hood Canal Bridge",
                    duration=timedelta(minutes=36),
                    conditions="SR-104 flow",
                ),
            ),
        ),
        Route(
            name="Seattle → Bainbridge",
            legs=(
                DriveLeg(
                    name="SeaTac to Seattle ferry terminal",
                    duration=timedelta(minutes=30),
                    conditions="I-5 express lanes",
                ),
                FerryLeg(
                    name="Seattle–Bainbridge ferry",
                    sailings=bainbridge_sailings,
                    crossing=timedelta(minutes=35),
                    loading_cutoff=timedelta(minutes=30),
                    buffer=timedelta(minutes=10),
                    label="WSF Seattle–Bainbridge",
                ),
                DriveLeg(
                    name="Bainbridge to Hood Canal Bridge",
                    duration=timedelta(minutes=48),
                    conditions="SR-305 and SR-3",
                ),
            ),
        ),
        Route(
            name="Tacoma Narrows",
            legs=(
                DriveLeg(
                    name="SeaTac to Tacoma Narrows",
                    duration=timedelta(minutes=42),
                    conditions="I-5 south",
                ),
                DriveLeg(
                    name="Tacoma Narrows to Hood Canal Bridge",
                    duration=timedelta(minutes=65),
                    conditions="WA-16 + WA-3",
                ),
            ),
        ),
    ]
