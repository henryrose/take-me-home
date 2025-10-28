# take-me-home

This repository models the SeaTac → Hood Canal Bridge trip using a few ferry and bridge routing options. The project is structured around reusable travel-time primitives and provides a simple script for evaluating each candidate route.

## Running the analysis

```bash
python scripts/analyze_routes.py
```

The script prints a human-readable summary that highlights the departure and arrival windows, terminal waits, and any slack risks for each itinerary.
