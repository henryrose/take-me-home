const fetch = require("node-fetch");
const { GOOGLE_MAPS_API_KEY, CACHE_TTL_SECONDS } = require("../config");
const { SimpleCache } = require("./simpleCache");

const cache = new SimpleCache();

function cacheKey(prefix, parts) {
  return `${prefix}:${parts.join(":")}`;
}

function formatCoords(coords) {
  return `${coords.lat},${coords.lng}`;
}

async function getDriveTimeMinutes({ origin, destination, departAt }) {
  if (!GOOGLE_MAPS_API_KEY || !origin || !destination) {
    return null;
  }

  const departureTime = departAt ? Math.floor(departAt.getTime() / 1000) : "now";
  const key = cacheKey("drivetime", [
    formatCoords(origin),
    formatCoords(destination),
    departureTime
  ]);
  const cached = cache.get(key);
  if (cached !== null) {
    return cached;
  }

  const params = new URLSearchParams({
    origin: formatCoords(origin),
    destination: formatCoords(destination),
    key: GOOGLE_MAPS_API_KEY,
    departure_time: String(departureTime)
  });

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Directions failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  const leg = payload.routes?.[0]?.legs?.[0];
  const durationSeconds = leg?.duration_in_traffic?.value ?? leg?.duration?.value;
  if (!durationSeconds) {
    cache.set(key, null, CACHE_TTL_SECONDS * 1000);
    return null;
  }

  const minutes = Math.round(durationSeconds / 60);
  cache.set(key, minutes, CACHE_TTL_SECONDS * 1000);
  return minutes;
}

module.exports = {
  getDriveTimeMinutes
};
