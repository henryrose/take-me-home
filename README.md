# take-me-home

Simple routing API + lightweight UI for comparing Puget Sound ferry and driving options between the Olympic Peninsula and Seattle.

## Highlights

- Compare Edmonds & Bainbridge ferry routes and a driving-only Tacoma Narrows alternative
- Real-time ferry schedules from WSDOT + traffic-aware driving time from Google Maps
- Minimal web UI 

## Overview

Take Me Home is a small service that ranks the primary routes for travelling between the  Olympic Peninsula and Seattle.
It uses ferry schedules, estimated waits, and driving time to provide quick ETA comparisons with a simple UI.

Maintainer: [Henry Rose](https://github.com/henryrose)

## Usage

Start the server:

```bash
npm install
npm run dev
```

Then open the UI at:

```
http://localhost:3000/
```

Or call the API directly:

```
GET /v1/health
GET /v1/routes?depart_at=ISO8601&direction=east_west|west_east
```

## Installation

Requirements: Node.js 18+ (or any current LTS).

```bash
npm install
```

## Configuration

Configuration is via `.env` (see `.env.example`).

Required for full functionality:
- `WSDOT_ACCESS_CODE` for ferry schedules
- `GOOGLE_MAPS_API_KEY` for driving time
- Coordinate values for home, destination, and ferry terminals

Optional tuning:
- `RATE_LIMIT_WINDOW_MS`: rate limiter window in ms (default 60000)
- `RATE_LIMIT_MAX`: max requests per IP per window (default 60)
- `REQUEST_TIMEOUT_MS`: upstream request timeout in ms (default 8000)

To force the Tacoma Narrows route, set `GIG_HARBOR_WAYPOINT_COORDS` to a lat,lng near the bridge.

## How it works

- Ferry routes: WSDOT/WSF schedule and route detail endpoints
- Drive times: Google Maps Directions API with traffic-aware durations
- Route ranking: currently returns all routes with computed ETA fields

## Roadmap

- Add authentication or API keys for public deployments
- Improve routing accuracy with optional waypoints and avoid flags
- Add deployment instructions once a hosted instance exists

## Contributing

Issues and suggestions are welcome. Open a GitHub issue with a clear description and repro steps when possible.

## License

No license specified yet.
