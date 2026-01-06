const express = require("express");
const { CACHE_TTL_SECONDS } = require("./config");
const { getRankedRoutes } = require("./services/routePlanner");

const app = express();

app.get("/v1/health", (req, res) => {
  res.json({
    status: "ok",
    cache_ttl_seconds: CACHE_TTL_SECONDS
  });
});

app.get("/v1/routes", async (req, res) => {
  try {
    const departAt = req.query.depart_at || null;
    const result = await getRankedRoutes({ departAt });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: "route_planning_failed",
      message: error.message
    });
  }
});

module.exports = app;
