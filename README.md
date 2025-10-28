# take-me-home

A lightweight toolkit for evaluating ferry travel plans. The package scores
candidate itineraries using tunable weights, surfaces the key factors that drive
those scores, and leaves room to incorporate future signals such as weather
alerts or reservation availability.

## Usage

```python
from datetime import datetime

from take_me_home import (
    FerryOption,
    FutureContext,
    ReservationAvailability,
    ScoringWeights,
    TravelPlan,
    WeatherDisruption,
    build_explanation,
    score_plan,
)

ferry = FerryOption(
    name="Evening Sailing",
    departure=datetime(2025, 10, 21, 17, 30),
    arrival=datetime(2025, 10, 21, 19, 0),
    risk=0.3,
    buffer_minutes=15,
)

plan = TravelPlan(
    driving_minutes_pre=50,
    driving_minutes_post=25,
    ferry=ferry,
    prep_buffer_minutes=20,
    arrival_buffer_minutes=10,
    future_context=FutureContext(
        weather=WeatherDisruption(severity=4, expected_delay_minutes=10),
        reservation=ReservationAvailability(status="limited", confidence=0.6),
    ),
)

weights = ScoringWeights().tuned(ferry_risk=0.2, weather_disruption=0.05)

breakdown = score_plan(plan, weights)
print(build_explanation(plan, breakdown))
```

## Tests

```
pytest
```
