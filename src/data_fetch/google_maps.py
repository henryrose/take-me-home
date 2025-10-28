"""Utilities for interacting with the Google Maps Directions API."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional

import requests

_DIRECTIONS_ENDPOINT = "https://maps.googleapis.com/maps/api/directions/json"


@dataclass
class DriveTimeEstimate:
    """Normalized representation of a single route leg."""

    origin: str
    destination: str
    distance_meters: int
    duration_seconds: int
    duration_in_traffic_seconds: Optional[int]
    summary: str
    raw: Dict[str, Any]


class DirectionsAPIError(RuntimeError):
    """Raised when the Google Maps Directions API returns an error."""


def _should_retry(status_code: int, payload: Dict[str, Any]) -> bool:
    if status_code >= 500:
        return True
    if status_code == 429:
        return True
    if payload.get("status") in {"UNKNOWN_ERROR", "OVER_QUERY_LIMIT"}:
        return True
    return False


def _backoff(attempt: int, base_delay: float) -> None:
    delay = base_delay * (2 ** attempt)
    time.sleep(delay)


def fetch_drive_time(
    origin: str,
    destination: str,
    api_key: str,
    departure_time: Optional[str] = "now",
    traffic_model: str = "best_guess",
    session: Optional[requests.Session] = None,
    max_retries: int = 3,
    backoff_factor: float = 0.5,
    extra_params: Optional[Dict[str, Any]] = None,
) -> DriveTimeEstimate:
    """Retrieve a normalized drive-time estimate between two points.

    Args:
        origin: Free-form origin, e.g. "Seatac" or "47.4502,-122.3088".
        destination: Destination place string or coordinates.
        api_key: Google Maps API key with Directions API enabled.
        departure_time: "now" for live traffic, or a unix timestamp.
        traffic_model: Traffic prediction model (`best_guess`, `pessimistic`, `optimistic`).
        session: Optional pre-configured requests session.
        max_retries: Number of retries for retriable errors.
        backoff_factor: Base delay in seconds for exponential backoff.
        extra_params: Additional query parameters to send to the API.

    Returns:
        A normalized :class:`DriveTimeEstimate`.

    Raises:
        DirectionsAPIError: When the API reports a non-retriable error or retries exhausted.
    """

    params: Dict[str, Any] = {
        "origin": origin,
        "destination": destination,
        "key": api_key,
        "departure_time": departure_time,
        "traffic_model": traffic_model,
    }
    if extra_params:
        params.update(extra_params)

    request_session = session or requests.Session()
    last_error: Optional[str] = None

    for attempt in range(max_retries + 1):
        response = request_session.get(_DIRECTIONS_ENDPOINT, params=params, timeout=10)
        payload: Dict[str, Any] = {}
        try:
            payload = response.json()
        except ValueError:
            payload = {"status": "JSON_PARSE_ERROR", "error_message": response.text[:200]}

        if response.ok and payload.get("status") == "OK":
            return _normalize_directions_response(payload, origin, destination)

        last_error = payload.get("error_message") or payload.get("status") or response.reason

        if attempt < max_retries and _should_retry(response.status_code, payload):
            _backoff(attempt, backoff_factor)
            continue

        raise DirectionsAPIError(f"Directions API error after {attempt + 1} attempts: {last_error}")

    raise DirectionsAPIError("Directions API error: exceeded retry budget")


def _normalize_directions_response(
    payload: Dict[str, Any], origin: str, destination: str
) -> DriveTimeEstimate:
    routes: Iterable[Dict[str, Any]] = payload.get("routes", [])
    try:
        first_route = next(iter(routes))
    except StopIteration as exc:
        raise DirectionsAPIError("Directions API response missing routes") from exc

    first_leg = first_route.get("legs", [{}])[0]

    duration = first_leg.get("duration", {}).get("value")
    duration_in_traffic = first_leg.get("duration_in_traffic", {}).get("value")
    distance = first_leg.get("distance", {}).get("value")

    if duration is None or distance is None:
        raise DirectionsAPIError("Directions API response missing duration or distance")

    return DriveTimeEstimate(
        origin=first_leg.get("start_address") or origin,
        destination=first_leg.get("end_address") or destination,
        distance_meters=int(distance),
        duration_seconds=int(duration),
        duration_in_traffic_seconds=int(duration_in_traffic) if duration_in_traffic is not None else None,
        summary=first_route.get("summary", ""),
        raw=payload,
    )
