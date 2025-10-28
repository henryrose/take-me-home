from datetime import datetime

from take_me_home.config import ScoringWeights
from take_me_home.models import (
    FerryOption,
    FutureContext,
    ReservationAvailability,
    TravelPlan,
    WeatherDisruption,
)
from take_me_home.scoring import score_plan


def make_plan(**kwargs):
    ferry = FerryOption(
        name="Test Ferry",
        departure=datetime(2025, 10, 21, 17, 0),
        arrival=datetime(2025, 10, 21, 18, 30),
        risk=0.25,
        buffer_minutes=10,
    )
    plan_kwargs = dict(
        driving_minutes_pre=45,
        driving_minutes_post=20,
        ferry=ferry,
        prep_buffer_minutes=15,
        arrival_buffer_minutes=10,
    )
    plan_kwargs.update(kwargs)
    return TravelPlan(**plan_kwargs)


def test_score_plan_includes_core_components():
    plan = make_plan()
    breakdown = score_plan(plan)
    assert breakdown.component("total_travel_time") > 0
    assert breakdown.component("driving_minutes") > 0
    assert breakdown.component("ferry_risk") == plan.ferry.risk * breakdown.weights.ferry_risk


def test_future_context_penalties_optional():
    plan = make_plan()
    weights = ScoringWeights(weather_disruption=0.2, reservation_pressure=1.5)
    future_plan = TravelPlan(
        driving_minutes_pre=plan.driving_minutes_pre,
        driving_minutes_post=plan.driving_minutes_post,
        ferry=plan.ferry,
        prep_buffer_minutes=plan.prep_buffer_minutes,
        arrival_buffer_minutes=plan.arrival_buffer_minutes,
        future_context=FutureContext(
            weather=WeatherDisruption(severity=6, expected_delay_minutes=20),
            reservation=ReservationAvailability(status="waitlist", confidence=0.8),
        ),
    )

    baseline = score_plan(plan, weights)
    enriched = score_plan(future_plan, weights)
    assert enriched.total_score > baseline.total_score
    assert "weather_disruption" in enriched.components
    assert "reservation_pressure" in enriched.components


def test_weights_tuning():
    weights = ScoringWeights().tuned(total_travel_time=0.5)
    assert weights.total_travel_time == 0.5
    assert weights.driving_minutes == 0.3
    try:
        ScoringWeights().tuned(unknown=0.1)
    except ValueError:
        pass
    else:
        raise AssertionError("Expected ValueError for invalid weight name")
