# API Evaluation for Drive-Time and Ferry Data

## Summary
- **Google Maps Directions API** provides comprehensive, route-specific drive-time estimates with traffic-aware routing that covers customized origin/destination pairs, including Seatac → Edmonds, Seatac → Seattle Ferry Terminal, and Seatac → Tacoma Narrows Bridge.
- **WSDOT Traveler Information API** exposes travel times for a fixed list of highway corridors and segments; none directly map to the requested Seatac-origin routes, so additional interpolation would be required.
- Google offers higher accuracy and flexibility at a usage cost, whereas WSDOT data are free but limited in coverage and granularity.

## Drive-Time Route Support
| Route | Google Maps Directions API | WSDOT Traveler Information API |
| --- | --- | --- |
| Seatac → Edmonds | Supported through standard Directions request with `origin=Seatac` and `destination=Edmonds, WA`. Traffic-aware ETAs available when `departure_time=now` and `traffic_model` is set. | No direct travel-time corridor available. Nearest corridors (e.g., I-5 Southcenter → Everett) require manual mapping and do not capture arterial segments into Edmonds. |
| Seatac → Seattle Ferry Terminal | Supported with multimodal driving directions leading to the terminal entrance at 801 Alaskan Way. | No dedicated corridor; closest segment (I-5 Seatac → Downtown Seattle) ends before ferry terminal surface streets. |
| Seatac → Tacoma Narrows Bridge | Supported with real-time traffic when specifying the bridge coordinates (`47.2690,-122.5517`). | Travel time available for SR 16 corridor (`SR16 Tacoma to Gig Harbor`), but segment start/end points differ from Seatac origin; additional Seatac → SR 16 ramp segment is missing. |

## Data Characteristics
| Attribute | Google Maps Directions API | WSDOT Traveler Information API |
| --- | --- | --- |
| **Coverage** | Global roads with up-to-the-minute traffic models. | Washington State freeways only, pre-defined origin/destination pairs. |
| **Freshness** | Real-time, updated continuously from aggregated telemetry and partner feeds. | Updated approximately every 5 minutes per WSDOT documentation; latency varies by corridor sensors. |
| **Cost** | $0.005 per call for Routes Advanced (as of 2024); monthly $200 free credit. | Free with API key registration. |
| **Quota / Rate Limits** | Default 60 QPS per project, 3,600 QPM hard limit; can request increase. | Informal guidance: ≤1 request/sec per endpoint and ≤10,000 requests/day per key. |
| **Authentication** | API key or OAuth 2.0; must enable Directions API in Google Cloud console. | API key appended as `apiKey` query parameter obtained from WSDOT Developer Program. |
| **Response Format** | JSON with nested routes/legs/steps; includes `duration`, `duration_in_traffic`, polyline geometry, warnings. | JSON arrays of corridor objects with `TravelTime`, `AverageTime`, `CurrentTime`, `Distance`, etc. |

## WSDOT Ferry REST Endpoints
- **Ferry Terminal Schedules**: `GET https://www.wsdot.wa.gov/Ferries/API/Schedule/rest/terminal/{terminalId}?apiKey={key}` — supports Edmonds (terminalId=15) and Seattle (terminalId=7) for Edmonds–Kingston and Seattle–Bainbridge routes.
- **Ferry Schedule By Route**: `GET https://www.wsdot.wa.gov/Ferries/API/Schedule/rest/route/{routeId}` — Edmonds–Kingston routeId=8, Seattle–Bainbridge routeId=5.
- **Vessel Watch**: `GET https://www.wsdot.wa.gov/Ferries/API/Vessels/rest/vessellocations` and `.../vessel/{vesselId}` provide live vessel positions and ETAs for the above routes.
- **Alert/Bulletin Feeds**: `GET https://www.wsdot.wa.gov/Ferries/API/Alerts/rest/routes/{routeId}` for service disruptions affecting Edmonds–Kingston and Seattle–Bainbridge.

### Authentication & Throttling
- **Registration**: Developers must request an API key from WSDOT; the same key covers traveler information and ferries APIs.
- **Usage Policy**: WSDOT requests clients keep traffic under ~1 request per second per endpoint and cache results for at least 60 seconds. Keys may be throttled or revoked when exceeding limits.
- **HTTPS & Headers**: All ferry endpoints require HTTPS. API key is passed as query parameter; no additional headers mandated, though WSDOT recommends identifying User-Agent for support.

## Recommendations
1. **Primary Drive-Time Source**: Use Google Maps Directions API for Seatac-origin ETA calculations due to flexible routing and traffic-aware predictions.
2. **Supplemental Context**: Leverage WSDOT corridor travel times to corroborate freeway congestion when available, but avoid relying solely on these data for bespoke origin/destination pairs.
3. **Ferry Data Integration**: Use WSDOT Ferry endpoints for schedules, vessel locations, and service alerts for Edmonds–Kingston and Seattle–Bainbridge. Combine with Google routing to estimate drive-to-terminal times.
4. **Caching Strategy**: Cache WSDOT responses for ≥1 minute and Google responses per user request to stay within rate guidelines and manage costs.
