# Take Me Home API Contract

## Overview
The Take Me Home service calculates multi-leg trips from Seattle to the Olympic Peninsula, combining driving segments, ferry sailings, and key bridge crossings. The API accepts a start time and optional travel preferences, and returns a structured itinerary that emphasizes:

- Estimated arrival at the Hood Canal Bridge.
- Detailed ferry sailing information (departure, crossing duration, arrival).
- Drive-time components broken down by leg.

Clients can request either JSON or formatted text, and the response embeds extensibility hooks for downstream consumers such as a web UI or notification pipeline.

---

## Request

### Endpoint
```
POST /v1/itineraries
```

### Headers
- `Content-Type: application/json`
- `Accept: application/json` or `Accept: text/plain`

### Body Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `start_time` | string (ISO 8601) | Yes | Desired departure timestamp. Time zone offsets must be included. |
| `preferences` | object | No | Optional travel preferences; omit entire field if not used. |
| `preferences.route_focus` | enum (`"shortest_total_time"`, `"minimize_drive_time"`, `"minimize_ferry_time"`) | No | Guides routing trade-offs between roadway driving versus ferry time. |
| `preferences.notifications` | object | No | Preferred notification channels for itinerary updates; see [Extensibility Hooks](#extensibility-hooks). |

#### Example Request
```json
{
  "start_time": "2024-07-15T15:30:00-07:00",
  "preferences": {
    "route_focus": "minimize_drive_time",
    "notifications": {
      "channels": ["push", "email"],
      "lead_time_minutes": 10
    }
  }
}
```

---

## Response

### Shared Fields
| Field | Type | Description |
|-------|------|-------------|
| `itinerary_id` | string (UUID) | Stable identifier for subsequent updates. |
| `generated_at` | string (ISO 8601) | Time the itinerary was produced. |
| `summary` | object | High-level highlights for quick display, including aggregated drive versus ferry time. |
| `segments` | array of objects | Ordered list of the travel legs. |
| `alerts` | array of objects | Optional advisory messages (closures, delays). |
| `hooks` | object | Extensibility metadata for UI and notification integrations. |

### JSON Representation
```json
{
  "itinerary_id": "2f4cf04a-5d7c-4e89-9b92-06d0e5ce5d17",
  "generated_at": "2024-07-14T09:05:00-07:00",
  "summary": {
    "hood_canal_arrival": {
      "eta": "2024-07-14T11:10:00-07:00",
      "buffer_minutes": 12,
      "notes": "Arrive 12 minutes before scheduled drawspan opening."
    },
    "ferry": {
      "route": "Seattle - Bainbridge Island",
      "scheduled_departure": "2024-07-14T09:40:00-07:00",
      "scheduled_arrival": "2024-07-14T10:15:00-07:00",
      "check_in_window_minutes": 30
    },
    "total_drive_time_minutes": 98,
    "total_ferry_time_minutes": 35,
    "route_focus": "minimize_drive_time"
  },
  "segments": [
    {
      "type": "drive",
      "name": "Seattle downtown to Bainbridge ferry terminal",
      "start_time": "2024-07-14T09:05:00-07:00",
      "end_time": "2024-07-14T09:28:00-07:00",
      "duration_minutes": 23,
      "distance_miles": 13.2,
      "traffic_level": "moderate"
    },
    {
      "type": "ferry",
      "route": "Seattle - Bainbridge Island",
      "terminal_arrival": "2024-07-14T09:28:00-07:00",
      "boarding_begins": "2024-07-14T09:30:00-07:00",
      "departure": "2024-07-14T09:40:00-07:00",
      "arrival": "2024-07-14T10:15:00-07:00",
      "crossing_minutes": 35,
      "vessel": "Puyallup",
      "notes": "Walk-on passengers board 5 minutes before sailing."
    },
    {
      "type": "drive",
      "name": "Bainbridge Island to Hood Canal Bridge",
      "start_time": "2024-07-14T10:20:00-07:00",
      "end_time": "2024-07-14T11:10:00-07:00",
      "duration_minutes": 50,
      "distance_miles": 38.4,
      "traffic_level": "light"
    },
    {
      "type": "drive",
      "name": "Hood Canal Bridge to Port Angeles",
      "start_time": "2024-07-14T11:15:00-07:00",
      "end_time": "2024-07-14T12:10:00-07:00",
      "duration_minutes": 55,
      "distance_miles": 48.7,
      "traffic_level": "moderate"
    }
  ],
  "alerts": [
    {
      "severity": "info",
      "code": "FERRY_DELAY",
      "message": "Expect minor loading delays due to holiday traffic.",
      "effective_until": "2024-07-14T10:30:00-07:00"
    }
  ],
  "hooks": {
    "ui": {
      "primary_callouts": [
        {
          "id": "hood-canal-eta",
          "title": "Hood Canal Bridge ETA",
          "value": "11:10 AM",
          "style": "countdown"
        },
        {
          "id": "next-ferry",
          "title": "Next Ferry Sailing",
          "value": "Seattle → Bainbridge 9:40 AM",
          "style": "badge"
        }
      ]
    },
    "notifications": {
      "subscriptions_supported": ["push", "sms", "email"],
      "default_lead_time_minutes": 15,
      "events": [
        {
          "event_type": "ferry-boarding",
          "trigger_time": "2024-07-14T09:30:00-07:00",
          "recommended_message": "Boarding for Seattle → Bainbridge ferry starts in 5 minutes."
        },
        {
          "event_type": "hood-canal-arrival",
          "trigger_time": "2024-07-14T11:10:00-07:00",
          "recommended_message": "Arriving at Hood Canal Bridge. Monitor for drawspan openings."
        }
      ]
    }
  }
}
```

### Text Representation
```
Itinerary 2f4cf04a-5d7c-4e89-9b92-06d0e5ce5d17 generated 2024-07-14 09:05 PDT
- Hood Canal Bridge ETA: 11:10 AM (12 min buffer before drawspan operations)
- Ferry: Seattle → Bainbridge — depart 9:40 AM, arrive 10:15 AM (check-in 30 min early)
- Route focus: minimize drive time (total drive 98 min, ferry 35 min)
- Drive segments:
  • Seattle downtown to Bainbridge ferry terminal — 23 min / 13.2 mi (moderate traffic)
  • Bainbridge Island to Hood Canal Bridge — 50 min / 38.4 mi (light traffic)
  • Hood Canal Bridge to Port Angeles — 55 min / 48.7 mi (moderate traffic)
Alerts:
- [info] Expect minor loading delays due to holiday traffic (until 10:30 AM)
Notifications:
- Ferry boarding reminder at 9:30 AM
- Hood Canal Bridge arrival reminder at 11:10 AM
```

---

## Error Handling
| HTTP Status | Code | Message | Notes |
|-------------|------|---------|-------|
| `400` | `INVALID_START_TIME` | "Start time must be an ISO 8601 timestamp with offset." | Returned when `start_time` fails validation. |
| `400` | `UNSUPPORTED_ACCEPT` | "Only application/json and text/plain are supported." | Returned when `Accept` header requests an unsupported format. |
| `409` | `FERRY_OVERBOOKED` | "Selected sailing is over capacity; choose a different departure." | Include `alternate_sailings` array when available. |
| `500` | `INTERNAL_ERROR` | "An unexpected error occurred." | Log correlation id via `X-Request-ID`. |

---

## Extensibility Hooks

### Web UI Integration
- `hooks.ui.primary_callouts` supplies ready-to-render cards for critical information (Hood Canal ETA, next ferry sailing). Each callout includes an `id`, `title`, `value`, and presentation `style` for direct mapping to UI components.
- Additional fields MAY include `cta` objects with labels and deeplink URLs for route alternatives.
- Include `segments[i].map_snapshot_url` (optional) to render route previews without extra API calls.

### Notification System Integration
- `hooks.notifications` describes supported subscription channels and default lead times, enabling a scheduler to register reminders.
- Each `events` entry includes a `trigger_time`, recommended copy, and `event_type` key for idempotent scheduling.
- Systems can acknowledge events by POSTing to `/v1/itineraries/{itinerary_id}/notifications/{event_type}` to prevent duplicate alerts.

### Future-Proofing
- New segment types (e.g., `rideshare`, `rail`) MUST declare `type` and provide mode-specific fields; clients should gracefully ignore unknown keys.
- `preferences` object is intentionally namespaced to allow feature-flagged options such as `preferences.real_time_recalc` or `preferences.carbon_score` without breaking existing clients.
- Version new response fields under `hooks` or `summary` while maintaining backward-compatible defaults to ensure existing UI and notification consumers remain functional.

---

## Change Log
- v1.0 (2024-07-14): Initial specification.
