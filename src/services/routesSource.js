const { getFerryRouteData } = require("./wsdotFerries");
const { getDriveTimeMinutes } = require("./googleDirections");
const { LOCATION_COORDS } = require("../config");

async function buildRoutes({ departAt }) {
  const departAtDate = departAt ? new Date(departAt) : new Date();
  const routeKeys = ["edmonds-kingston", "seattle-bainbridge"];

  const withDriveTimes = await Promise.all(
    routeKeys.map(async (routeKey) => {
      const driveSegments = getDriveSegments(routeKey);
      const firstLegDriveTime = await getFirstLegDriveTime(driveSegments, departAtDate);
      const terminalArrivalAt = firstLegDriveTime !== null
        ? new Date(departAtDate.getTime() + firstLegDriveTime * 60000)
        : null;

      const route = await getFerryRouteData({
        routeKey,
        departAt: departAtDate,
        terminalArrivalAt
      });

      if (!route) {
        return null;
      }

      const secondLegDriveTime = await getSecondLegDriveTime(
        driveSegments,
        departAtDate,
        firstLegDriveTime,
        route
      );

      const driveTimeMinutes = firstLegDriveTime !== null && secondLegDriveTime !== null
        ? firstLegDriveTime + secondLegDriveTime
        : null;

      const totalEtaMinutes = calculateTotalEtaMinutes(route, driveTimeMinutes);

      return {
        ...route,
        total_eta_minutes: totalEtaMinutes,
        drive_time_minutes: driveTimeMinutes,
        alerts: []
      };
    })
  );

  return withDriveTimes.filter(Boolean);
}

function getDriveSegments(routeId) {
  if (!LOCATION_COORDS.HOME || !LOCATION_COORDS.DESTINATION) {
    return null;
  }

  if (routeId === "edmonds-kingston") {
    return [
      { origin: LOCATION_COORDS.HOME, destination: LOCATION_COORDS.EDMONDS_TERMINAL },
      { origin: LOCATION_COORDS.KINGSTON_TERMINAL, destination: LOCATION_COORDS.DESTINATION }
    ];
  }

  if (routeId === "seattle-bainbridge") {
    return [
      { origin: LOCATION_COORDS.HOME, destination: LOCATION_COORDS.SEATTLE_TERMINAL },
      { origin: LOCATION_COORDS.BAINBRIDGE_TERMINAL, destination: LOCATION_COORDS.DESTINATION }
    ];
  }

  return null;
}

async function getFirstLegDriveTime(segments, departAt) {
  if (!segments || segments.some((segment) => !segment.origin || !segment.destination)) {
    return null;
  }

  return getDriveTimeMinutes({
    origin: segments[0].origin,
    destination: segments[0].destination,
    departAt
  });
}

async function getSecondLegDriveTime(segments, departAt, firstLegDriveTime, route) {
  if (!segments || segments.some((segment) => !segment.origin || !segment.destination)) {
    return null;
  }

  let secondLegDeparture = null;
  if (
    firstLegDriveTime !== null
    && route.ferry_wait_minutes !== null
    && route.ferry_crossing_minutes !== null
  ) {
    secondLegDeparture = new Date(
      departAt.getTime()
        + (firstLegDriveTime + route.ferry_wait_minutes + route.ferry_crossing_minutes) * 60000
    );
  }

  return getDriveTimeMinutes({
    origin: segments[1].origin,
    destination: segments[1].destination,
    departAt: secondLegDeparture
  });
}

function calculateTotalEtaMinutes(route, driveTimeMinutes) {
  if (
    driveTimeMinutes === null
    || route.ferry_wait_minutes === null
    || route.ferry_crossing_minutes === null
  ) {
    return null;
  }

  return driveTimeMinutes + route.ferry_wait_minutes + route.ferry_crossing_minutes;
}

module.exports = {
  buildRoutes
};
