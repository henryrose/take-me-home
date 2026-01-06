# take-me-home

Targeted routing API for Olympic Peninsula to Seattle area.

## Development

```bash
npm install
npm run dev
```

Endpoints:
- `GET /v1/health`
- `GET /v1/routes?depart_at=ISO8601`

Configuration via `.env` (see `.env.example`).

## Ferry data

This API uses WSDOT/WSF REST endpoints for schedules and terminal wait times.
Set `WSDOT_ACCESS_CODE` plus the terminal IDs in `.env` (see `.env.example`).

## Driving time

Driving time uses the Google Maps Directions API. Provide `GOOGLE_MAPS_API_KEY`
and the coordinate values in `.env`.
