const { fetchJson } = require("./wsdotClient");
const { parseWsdotDate, diffMinutes, formatTripDate } = require("./dateUtils");
const { SimpleCache } = require("./simpleCache");
const {
  WSDOT_ACCESS_CODE,
  CACHE_TTL_SECONDS,
  FERRY_TERMINAL_IDS
} = require("../config");

const SCHEDULE_BASE_URL = "https://wsdot.wa.gov/Ferries/API/Schedule/rest";
const cache = new SimpleCache();

function cacheKey(prefix, parts) {
  return `${prefix}:${parts.join(":")}`;
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    const arrayValue = Object.values(value).find(Array.isArray);
    if (arrayValue) {
      return arrayValue;
    }
    return [value];
  }
  return [];
}

function extractSailings(scheduleResponse) {
  const terminalCombos = scheduleResponse?.TerminalCombos;
  if (Array.isArray(terminalCombos)) {
    return terminalCombos.flatMap((combo) => toArray(combo.Times));
  }

  const raw = scheduleResponse?.GetTodaysScheduleByTerminalComboResult
    ?? scheduleResponse?.GetScheduleByTerminalComboResult
    ?? scheduleResponse?.GetScheduleByRouteResult
    ?? scheduleResponse;
  return toArray(raw);
}

function findNextSailing(sailings, departAt) {
  const now = departAt || new Date();
  const upcoming = sailings
    .map((sailing) => {
      const departingValue = sailing.DepartingTime
        ?? sailing.DepartureTime
        ?? sailing.DepartingDateTime
        ?? sailing.DepartureDateTime
        ?? sailing.ScheduledDeparture;
      const arrivingValue = sailing.ArrivingTime
        ?? sailing.ArrivalTime
        ?? sailing.ArrivingDateTime
        ?? sailing.ArrivalDateTime
        ?? sailing.ScheduledArrival;

      const departingAt = parseWsdotDate(departingValue);
      const arrivingAt = parseWsdotDate(arrivingValue);

      return {
        sailing,
        departingAt,
        arrivingAt
      };
    })
    .filter(({ departingAt, sailing }) => {
      const isCancelled = sailing.IsCancelled
        ?? sailing.IsCanceled
        ?? sailing.Canceled
        ?? sailing.Cancelled;
      return departingAt && departingAt >= now && !isCancelled;
    })
    .sort((a, b) => a.departingAt - b.departingAt);
  
  return upcoming[0] || null;
}

async function fetchScheduleToday({ departingTerminalId, arrivingTerminalId, onlyRemainingTimes }) {
  if (!WSDOT_ACCESS_CODE) {
    return null;
  }

  const key = cacheKey("schedule", [
    departingTerminalId,
    arrivingTerminalId,
    onlyRemainingTimes
  ]);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const path = `/scheduletoday/${departingTerminalId}/${arrivingTerminalId}/${onlyRemainingTimes}`;
  const response = await fetchJson(SCHEDULE_BASE_URL, path, {
    apiaccesscode: WSDOT_ACCESS_CODE
  });

  cache.set(key, response, CACHE_TTL_SECONDS * 1000);
  return response;
}

async function fetchRouteDetails({ tripDate, departingTerminalId, arrivingTerminalId }) {
  if (!WSDOT_ACCESS_CODE) {
    return null;
  }

  const key = cacheKey("routedetails", [tripDate, departingTerminalId, arrivingTerminalId]);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const path = `/routedetails/${tripDate}/${departingTerminalId}/${arrivingTerminalId}`;
  const response = await fetchJson(SCHEDULE_BASE_URL, path, {
    apiaccesscode: WSDOT_ACCESS_CODE
  });

  cache.set(key, response, CACHE_TTL_SECONDS * 1000);
  return response;
}

function getFerryRouteDefinition(routeKey) {
  if (routeKey === "edmonds-kingston") {
    return {
      id: "edmonds-kingston",
      name: "Edmonds ↔ Kingston Ferry",
      routeId: 6,
      departingTerminalId: FERRY_TERMINAL_IDS.EDMONDS,
      arrivingTerminalId: FERRY_TERMINAL_IDS.KINGSTON,
      components: ["Hood Canal Bridge", "Edmonds/Kingston Ferry"]
    };
  }

  if (routeKey === "seattle-bainbridge") {
    return {
      id: "seattle-bainbridge",
      name: "Seattle ↔ Bainbridge Ferry",
      routeId: 5,
      departingTerminalId: FERRY_TERMINAL_IDS.SEATTLE,
      arrivingTerminalId: FERRY_TERMINAL_IDS.BAINBRIDGE,
      components: ["Hood Canal Bridge", "Seattle/Bainbridge Ferry"]
    };
  }

  return null;
}

async function getFerryRouteData({ routeKey, departAt, terminalArrivalAt, direction }) {
  const definition = getFerryRouteDefinition(routeKey);
  if (!definition) {
    return null;
  }

  const normalizedDirection = direction === "west_east" ? "west_east" : "east_west";
  const routeDefinition = normalizedDirection === "east_west"
    ? {
      ...definition,
      departingTerminalId: definition.arrivingTerminalId,
      arrivingTerminalId: definition.departingTerminalId
    }
    : definition;

  if (!WSDOT_ACCESS_CODE) {
    return {
      ...routeDefinition,
      data_status: "missing_access_code"
    };
  }

  const scheduleResponse = await fetchScheduleToday({
    departingTerminalId: routeDefinition.departingTerminalId,
    arrivingTerminalId: routeDefinition.arrivingTerminalId,
    onlyRemainingTimes: true
  });

  const tripDate = formatTripDate(departAt || new Date());
  const routeDetailsResponse = await fetchRouteDetails({
    tripDate,
    departingTerminalId: routeDefinition.departingTerminalId,
    arrivingTerminalId: routeDefinition.arrivingTerminalId
  });

  const routeDetails = Array.isArray(routeDetailsResponse)
    ? routeDetailsResponse[0]
    : routeDetailsResponse;

  const crossingTimeFromRoute = routeDetails?.CrossingTime
    ? Number(routeDetails.CrossingTime)
    : null;

  const sailings = extractSailings(scheduleResponse);
  const referenceTime = terminalArrivalAt || departAt || new Date();
  const nextSailing = findNextSailing(sailings, referenceTime);

  let ferryWaitMinutes = null;
  let ferryCrossingMinutes = crossingTimeFromRoute;
  let nextSailingDeparture = null;
  let nextSailingArrival = null;

  if (nextSailing) {
    const wait = diffMinutes(referenceTime, nextSailing.departingAt);
    ferryWaitMinutes = wait === null ? null : Math.max(wait, 0);
    if (!ferryCrossingMinutes && nextSailing.arrivingAt) {
      ferryCrossingMinutes = diffMinutes(nextSailing.departingAt, nextSailing.arrivingAt);
    }
    nextSailingDeparture = nextSailing.departingAt
      ? nextSailing.departingAt.toISOString()
      : null;
    nextSailingArrival = nextSailing.arrivingAt
      ? nextSailing.arrivingAt.toISOString()
      : null;
  }

  return {
    ...routeDefinition,
    ferry_wait_minutes: ferryWaitMinutes,
    ferry_crossing_minutes: ferryCrossingMinutes,
    next_sailing_departure: nextSailingDeparture,
    next_sailing_arrival: nextSailingArrival,
    schedule_count: sailings.length
  };
}

module.exports = {
  getFerryRouteData
};
