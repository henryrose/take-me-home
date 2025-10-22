"""Data access helpers for WSDOT Traveler Information and Ferries APIs."""

from __future__ import annotations

import datetime as dt
import time
from typing import Any, Dict, Iterable, List, Optional

import requests

_TRAVEL_TIMES_ENDPOINT = "https://www.wsdot.wa.gov/Traffic/api/TravelTimes/TravelTimesREST.svc/GetTravelTimesAsJson"
_FERRY_TERMINAL_SCHEDULE_ENDPOINT = "https://www.wsdot.wa.gov/Ferries/API/Schedule/rest/terminal/{terminal_id}"
_FERRY_ROUTE_SCHEDULE_ENDPOINT = "https://www.wsdot.wa.gov/Ferries/API/Schedule/rest/route/{route_id}"
_FERRY_ALERTS_ENDPOINT = "https://www.wsdot.wa.gov/Ferries/API/Alerts/rest/routes/{route_id}"
_VESSEL_LOCATIONS_ENDPOINT = "https://www.wsdot.wa.gov/Ferries/API/Vessels/rest/vessellocations"


class WSDOTAPIError(RuntimeError):
    """Raised when WSDOT APIs return errors or malformed payloads."""


def _should_retry(status_code: int) -> bool:
    return status_code >= 500 or status_code == 429


def _backoff(attempt: int, base_delay: float) -> None:
    delay = base_delay * (2 ** attempt)
    time.sleep(delay)


def _request_json(
    url: str,
    api_key: str,
    session: Optional[requests.Session] = None,
    params: Optional[Dict[str, Any]] = None,
    max_retries: int = 3,
    backoff_factor: float = 0.5,
) -> Any:
    request_session = session or requests.Session()
    params = dict(params or {})
    params.setdefault("apiKey", api_key)

    for attempt in range(max_retries + 1):
        response = request_session.get(url, params=params, timeout=10)
        if response.ok:
            try:
                return response.json()
            except ValueError as exc:
                raise WSDOTAPIError(f"Failed to parse JSON from {url}") from exc

        if attempt < max_retries and _should_retry(response.status_code):
            _backoff(attempt, backoff_factor)
            continue

        raise WSDOTAPIError(
            f"WSDOT API error {response.status_code}: {response.text[:200]}"
        )

    raise WSDOTAPIError("WSDOT API error: exceeded retry budget")


def fetch_corridor_travel_times(
    api_key: str,
    corridor_ids: Optional[Iterable[int]] = None,
    session: Optional[requests.Session] = None,
    max_retries: int = 3,
    backoff_factor: float = 0.5,
) -> List[Dict[str, Any]]:
    """Retrieve normalized travel-time data for one or more WSDOT corridors."""

    payload = _request_json(
        _TRAVEL_TIMES_ENDPOINT,
        api_key=api_key,
        session=session,
        max_retries=max_retries,
        backoff_factor=backoff_factor,
    )

    if not isinstance(payload, list):
        raise WSDOTAPIError("Unexpected travel-times payload format")

    allowed_ids = set(int(cid) for cid in corridor_ids) if corridor_ids else None

    normalized: List[Dict[str, Any]] = []
    for corridor in payload:
        try:
            corridor_id = int(corridor["TravelTimeID"])
        except (KeyError, TypeError, ValueError) as exc:
            raise WSDOTAPIError("Missing TravelTimeID in corridor payload") from exc

        if allowed_ids is not None and corridor_id not in allowed_ids:
            continue

        normalized.append(
            {
                "corridor_id": corridor_id,
                "name": corridor.get("Name"),
                "current_travel_time_minutes": corridor.get("CurrentTime"),
                "average_travel_time_minutes": corridor.get("AverageTime"),
                "distance_miles": corridor.get("Distance"),
                "last_updated": _parse_timestamp(corridor.get("TimeUpdated")),
                "raw": corridor,
            }
        )

    return normalized


def fetch_terminal_schedule(
    api_key: str,
    terminal_id: int,
    session: Optional[requests.Session] = None,
    max_retries: int = 3,
    backoff_factor: float = 0.5,
) -> Dict[str, Any]:
    """Fetch normalized ferry sailings for a terminal (e.g., Edmonds or Seattle)."""

    url = _FERRY_TERMINAL_SCHEDULE_ENDPOINT.format(terminal_id=terminal_id)
    payload = _request_json(
        url,
        api_key=api_key,
        session=session,
        max_retries=max_retries,
        backoff_factor=backoff_factor,
    )

    if not isinstance(payload, dict):
        raise WSDOTAPIError("Unexpected terminal schedule payload format")

    sailings = [
        {
            "route_id": sailing.get("RouteID"),
            "departing_terminal_id": sailing.get("DepartingTerminalID"),
            "arriving_terminal_id": sailing.get("ArrivingTerminalID"),
            "scheduled_departure": _parse_timestamp(sailing.get("Departure")),
            "notes": sailing.get("Annotations"),
            "is_cancelled": bool(sailing.get("Cancelled")),
            "raw": sailing,
        }
        for sailing in payload.get("Sailings", [])
    ]

    return {
        "terminal_id": terminal_id,
        "terminal_name": payload.get("TerminalName"),
        "sailings": sailings,
        "fetched_at": dt.datetime.utcnow().isoformat() + "Z",
        "raw": payload,
    }


def fetch_route_schedule(
    api_key: str,
    route_id: int,
    session: Optional[requests.Session] = None,
    max_retries: int = 3,
    backoff_factor: float = 0.5,
) -> Dict[str, Any]:
    """Fetch route-level schedule data (e.g., Edmonds–Kingston)."""

    url = _FERRY_ROUTE_SCHEDULE_ENDPOINT.format(route_id=route_id)
    payload = _request_json(
        url,
        api_key=api_key,
        session=session,
        max_retries=max_retries,
        backoff_factor=backoff_factor,
    )

    if not isinstance(payload, dict):
        raise WSDOTAPIError("Unexpected route schedule payload format")

    return {
        "route_id": route_id,
        "route_name": payload.get("RouteDescription"),
        "next_sailings": [
            {
                "vessel_name": sailing.get("VesselName"),
                "departing_terminal_id": sailing.get("DepartingTerminalID"),
                "arriving_terminal_id": sailing.get("ArrivingTerminalID"),
                "scheduled_departure": _parse_timestamp(sailing.get("Departure")),
                "load_status": sailing.get("Load"),
            }
            for sailing in payload.get("Sailings", [])
        ],
        "raw": payload,
    }


def fetch_route_alerts(
    api_key: str,
    route_id: int,
    session: Optional[requests.Session] = None,
    max_retries: int = 3,
    backoff_factor: float = 0.5,
) -> List[Dict[str, Any]]:
    """Fetch service alerts for a ferry route."""

    url = _FERRY_ALERTS_ENDPOINT.format(route_id=route_id)
    payload = _request_json(
        url,
        api_key=api_key,
        session=session,
        max_retries=max_retries,
        backoff_factor=backoff_factor,
    )

    if not isinstance(payload, list):
        raise WSDOTAPIError("Unexpected route alerts payload format")

    return [
        {
            "route_id": route_id,
            "alert_id": alert.get("AlertID"),
            "title": alert.get("Title"),
            "description": alert.get("FullDescription"),
            "last_updated": _parse_timestamp(alert.get("LastUpdated")),
            "raw": alert,
        }
        for alert in payload
    ]


def fetch_vessel_locations(
    api_key: str,
    session: Optional[requests.Session] = None,
    max_retries: int = 3,
    backoff_factor: float = 0.5,
) -> List[Dict[str, Any]]:
    """Fetch normalized vessel positions for all active ferries."""

    payload = _request_json(
        _VESSEL_LOCATIONS_ENDPOINT,
        api_key=api_key,
        session=session,
        max_retries=max_retries,
        backoff_factor=backoff_factor,
    )

    if not isinstance(payload, list):
        raise WSDOTAPIError("Unexpected vessel locations payload format")

    return [
        {
            "vessel_id": vessel.get("VesselID"),
            "vessel_name": vessel.get("VesselName"),
            "route_id": vessel.get("RouteID"),
            "latitude": vessel.get("Latitude"),
            "longitude": vessel.get("Longitude"),
            "speed_knots": vessel.get("Speed"),
            "heading_degrees": vessel.get("Heading"),
            "last_updated": _parse_timestamp(vessel.get("At")),
            "raw": vessel,
        }
        for vessel in payload
    ]


def _parse_timestamp(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    return parsed.isoformat().replace("+00:00", "Z")
