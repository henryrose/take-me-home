const path = require("path");
const express = require("express");
const { CACHE_TTL_SECONDS, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require("./config");
const { getRankedRoutes } = require("./services/routePlanner");

const app = express();
const publicPath = path.join(__dirname, "..", "public");

app.use(express.static(publicPath));

const rateLimiter = new Map();
app.use((req, res, next) => {
  const now = Date.now();
  const ip = req.ip || "unknown";
  const entry = rateLimiter.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimiter.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    res.status(429).json({
      error: "rate_limited",
      message: "Too many requests. Please try again shortly."
    });
    return;
  }
  entry.count += 1;
  return next();
});

app.get("/v1/health", (req, res) => {
  res.json({
    status: "ok",
    cache_ttl_seconds: CACHE_TTL_SECONDS
  });
});

app.get("/v1/routes", async (req, res) => {
  try {
    const departAt = req.query.depart_at || null;
    const direction = req.query.direction || "east_west";
    if (!["east_west", "west_east"].includes(direction)) {
      return res.status(400).json({
        error: "invalid_direction",
        message: "direction must be east_west or west_east"
      });
    }
    const result = await getRankedRoutes({ departAt, direction });
    res.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("route planning failed", error);
    res.status(500).json({
      error: "route_planning_failed",
      message: "Route planning failed."
    });
  }
});

module.exports = app;
