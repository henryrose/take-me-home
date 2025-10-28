"""Utilities that produce human-readable explanations of plan scores."""

from __future__ import annotations

from datetime import datetime
from typing import List

from .models import FutureContext, TravelPlan
from .scoring import ScoreBreakdown


def _format_time(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M")


def _future_context_notes(context: FutureContext) -> List[str]:
    details: List[str] = []
    if context.weather:
        weather = context.weather
        details.append(
            f"Weather watch: severity {weather.severity}/10 with an expected {weather.expected_delay_minutes} min delay"
        )
    if context.reservation:
        reservation = context.reservation
        details.append(
            f"Reservations: {reservation.status} (confidence {reservation.confidence:.0%})"
        )
    if context.notes:
        details.append(f"Additional context: {context.notes}")
    return details


def build_explanation(plan: TravelPlan, breakdown: ScoreBreakdown) -> str:
    """Generate an annotated description of how a plan was scored."""

    lines: List[str] = []
    lines.append("Take Me Home · plan evaluation")
    lines.append("=" * 32)
    lines.append(
        f"Selected ferry: {plan.ferry.name} departing {_format_time(plan.ferry.departure)}"
    )
    lines.append(
        f"Estimated arrival (door-to-door): {_format_time(plan.estimated_arrival)}"
    )
    lines.append(
        f"Total travel time: {plan.total_travel_minutes} min (driving {plan.total_driving_minutes} min, buffers {plan.total_buffer_minutes} min)"
    )
    lines.append("Score breakdown:")
    for key, value in breakdown.components.items():
        lines.append(f"  - {key.replace('_', ' ').title()}: {value:.2f}")
    lines.append(f"Composite score: {breakdown.total_score:.2f}")

    buffers: List[str] = []
    if plan.prep_buffer_minutes:
        buffers.append(f"prep buffer {plan.prep_buffer_minutes} min before departure")
    if plan.ferry.buffer_minutes:
        buffers.append(f"ferry check-in buffer {plan.ferry.buffer_minutes} min")
    if plan.arrival_buffer_minutes:
        buffers.append(
            f"arrival buffer {plan.arrival_buffer_minutes} min before post-drive commitments"
        )
    if buffers:
        lines.append("Buffers considered:")
        lines.extend(f"  - {item}" for item in buffers)

    context_notes = _future_context_notes(plan.future_context)
    if context_notes:
        lines.append("Future readiness signals:")
        lines.extend(f"  - {note}" for note in context_notes)

    return "\n".join(lines)
