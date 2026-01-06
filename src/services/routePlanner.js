const { buildRoutes } = require("./routesSource");

async function getRankedRoutes({ departAt }) {
  const routes = await buildRoutes({ departAt });
  return {
    generated_at: new Date().toISOString(),
    depart_at: departAt,
    routes
  };
}

module.exports = {
  getRankedRoutes
};
