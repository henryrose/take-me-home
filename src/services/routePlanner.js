const { buildRoutes } = require("./routesSource");

async function getRankedRoutes({ departAt, direction }) {
  const routes = await buildRoutes({ departAt, direction });
  return {
    generated_at: new Date().toISOString(),
    depart_at: departAt,
    direction,
    routes
  };
}

module.exports = {
  getRankedRoutes
};
