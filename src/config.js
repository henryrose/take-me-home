const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const CACHE_TTL_SECONDS = process.env.CACHE_TTL_SECONDS
  ? Number(process.env.CACHE_TTL_SECONDS)
  : 300;
const RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS
  ? Number(process.env.RATE_LIMIT_WINDOW_MS)
  : 60_000;
const RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX
  ? Number(process.env.RATE_LIMIT_MAX)
  : 60;
const REQUEST_TIMEOUT_MS = process.env.REQUEST_TIMEOUT_MS
  ? Number(process.env.REQUEST_TIMEOUT_MS)
  : 8_000;
const WSDOT_ACCESS_CODE = process.env.WSDOT_ACCESS_CODE || "";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

const FERRY_TERMINAL_IDS = {
  EDMONDS: process.env.FERRY_TERMINAL_ID_EDMONDS
    ? Number(process.env.FERRY_TERMINAL_ID_EDMONDS)
    : 8,
  KINGSTON: process.env.FERRY_TERMINAL_ID_KINGSTON
    ? Number(process.env.FERRY_TERMINAL_ID_KINGSTON)
    : 12,
  SEATTLE: process.env.FERRY_TERMINAL_ID_SEATTLE
    ? Number(process.env.FERRY_TERMINAL_ID_SEATTLE)
    : 7,
  BAINBRIDGE: process.env.FERRY_TERMINAL_ID_BAINBRIDGE
    ? Number(process.env.FERRY_TERMINAL_ID_BAINBRIDGE)
    : 3
};

function parseCoords(value) {
  if (!value) {
    return null;
  }
  const parts = value.split(",").map((item) => item.trim());
  if (parts.length !== 2) {
    return null;
  }
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return { lat, lng };
}

const LOCATION_COORDS = {
  HOME: parseCoords(process.env.HOME_COORDS),
  DESTINATION: parseCoords(process.env.DESTINATION_COORDS),
  EDMONDS_TERMINAL: parseCoords(process.env.EDMONDS_TERMINAL_COORDS),
  KINGSTON_TERMINAL: parseCoords(process.env.KINGSTON_TERMINAL_COORDS),
  SEATTLE_TERMINAL: parseCoords(process.env.SEATTLE_TERMINAL_COORDS),
  BAINBRIDGE_TERMINAL: parseCoords(process.env.BAINBRIDGE_TERMINAL_COORDS),
  GIG_HARBOR_WAYPOINT: parseCoords(process.env.GIG_HARBOR_WAYPOINT_COORDS)
};

module.exports = {
  PORT,
  CACHE_TTL_SECONDS,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX,
  REQUEST_TIMEOUT_MS,
  WSDOT_ACCESS_CODE,
  GOOGLE_MAPS_API_KEY,
  FERRY_TERMINAL_IDS,
  LOCATION_COORDS
};
