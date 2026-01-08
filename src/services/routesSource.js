const { getFerryRouteData } = require("./wsdotFerries");
const { getDriveTimeMinutes } = require("./googleDirections");
const { LOCATION_COORDS } = require("../config");

async function buildRoutes({ departAt, direction }) {
  const departAtDate = departAt ? new Date(departAt) : new Date();
  const normalizedDirection = normalizeDirection(direction);
  const routeDefinitions = [
    { key: "edmonds-kingston", mode: "ferry" },
    { key: "seattle-bainbridge", mode: "ferry" },
    { key: "tacoma-narrows-bridge", mode: "drive" }
  ];

  const withDriveTimes = await Promise.all(
    routeDefinitions.map(async ({ key: routeKey, mode }) => {
      const driveSegments = getDriveSegments(routeKey, normalizedDirection);

      if (mode === "drive") {
      const driveTimeMinutes = await getDriveTimeMinutesForSegments(
        driveSegments,
        departAtDate
      );
        const driveLegs = buildDriveLegTimes(driveSegments, [driveTimeMinutes]);

        return {
          id: "tacoma-narrows-bridge",
          name: "Tacoma Narrows Bridge",
          route_mode: "drive",
          components: ["Poulsbo", "Bremerton", "Tacoma"],
          total_eta_minutes: driveTimeMinutes,
          drive_time_minutes: driveTimeMinutes,
          drive_legs: driveLegs,
          ferry_wait_minutes: null,
          ferry_crossing_minutes: null,
          next_sailing_departure: null,
          next_sailing_arrival: null,
          schedule_count: null,
          alerts: []
        };
      }

      const firstLegDriveTime = await getFirstLegDriveTime(driveSegments, departAtDate);
      const terminalArrivalAt = firstLegDriveTime !== null
        ? new Date(departAtDate.getTime() + firstLegDriveTime * 60000)
        : null;

      const route = await getFerryRouteData({
        routeKey,
        departAt: departAtDate,
        terminalArrivalAt,
        direction: normalizedDirection
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
      const driveLegs = buildDriveLegTimes(
        driveSegments,
        [firstLegDriveTime, secondLegDriveTime]
      );

      return {
        ...route,
        route_mode: "ferry",
        total_eta_minutes: totalEtaMinutes,
        drive_time_minutes: driveTimeMinutes,
        drive_legs: driveLegs,
        alerts: []
      };
    })
  );

  return withDriveTimes.filter(Boolean);
}

function normalizeDirection(direction) {
  return direction === "west_east" ? "west_east" : "east_west";
}

function getDriveSegments(routeId, direction) {
  if (!LOCATION_COORDS.HOME || !LOCATION_COORDS.DESTINATION) {
    return null;
  }

  if (routeId === "edmonds-kingston") {
    if (direction === "west_east") {
      return [
        {
          name: "Destination to Edmonds terminal",
          origin: LOCATION_COORDS.DESTINATION,
          destination: LOCATION_COORDS.EDMONDS_TERMINAL
        },
        {
          name: "Kingston terminal to Home",
          origin: LOCATION_COORDS.KINGSTON_TERMINAL,
          destination: LOCATION_COORDS.HOME
        }
      ];
    }

    return [
      {
        name: "Home to Kingston terminal",
        origin: LOCATION_COORDS.HOME,
        destination: LOCATION_COORDS.KINGSTON_TERMINAL
      },
      {
        name: "Edmonds terminal to Destination",
        origin: LOCATION_COORDS.EDMONDS_TERMINAL,
        destination: LOCATION_COORDS.DESTINATION
      }
    ];
  }

  if (routeId === "seattle-bainbridge") {
    if (direction === "west_east") {
      return [
        {
          name: "Destination to Seattle terminal",
          origin: LOCATION_COORDS.DESTINATION,
          destination: LOCATION_COORDS.SEATTLE_TERMINAL
        },
        {
          name: "Bainbridge terminal to Home",
          origin: LOCATION_COORDS.BAINBRIDGE_TERMINAL,
          destination: LOCATION_COORDS.HOME
        }
      ];
    }

    return [
      {
        name: "Home to Bainbridge terminal",
        origin: LOCATION_COORDS.HOME,
        destination: LOCATION_COORDS.BAINBRIDGE_TERMINAL
      },
      {
        name: "Seattle terminal to Destination",
        origin: LOCATION_COORDS.SEATTLE_TERMINAL,
        destination: LOCATION_COORDS.DESTINATION
      }
    ];
  }

  if (routeId === "tacoma-narrows-bridge") {
    const waypoint = LOCATION_COORDS.GIG_HARBOR_WAYPOINT
      ? [LOCATION_COORDS.GIG_HARBOR_WAYPOINT]
      : null;
    const avoid = ["ferries"];
    if (direction === "west_east") {
      return [
        {
          name: "Seattle to Olympic Peninsula via Tacoma",
          origin: LOCATION_COORDS.DESTINATION,
          destination: LOCATION_COORDS.HOME,
          waypoints: waypoint,
          avoid
        }
      ];
    }

    return [
      {
        name: "Olympic Peninsula to Seattle via Tacoma",
        origin: LOCATION_COORDS.HOME,
        destination: LOCATION_COORDS.DESTINATION,
        waypoints: waypoint,
        avoid
      }
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
    departAt,
    waypoints: segments[0].waypoints,
    avoid: segments[0].avoid
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

async function getDriveTimeMinutesForSegments(segments, departAt) {
  if (!segments || segments.length === 0) {
    return null;
  }
  if (segments.some((segment) => !segment.origin || !segment.destination)) {
    return null;
  }
  if (segments.length !== 1) {
    return null;
  }

  return getDriveTimeMinutes({
    origin: segments[0].origin,
    destination: segments[0].destination,
    departAt
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

function buildDriveLegTimes(segments, driveTimes) {
  if (!segments) {
    return [];
  }

  return segments.map((segment, index) => {
    const minutes = Array.isArray(driveTimes) ? driveTimes[index] : null;
    return {
      name: segment.name || `Leg ${index + 1}`,
      minutes: minutes === undefined ? null : minutes,
      origin: segment.origin || null,
      destination: segment.destination || null,
      waypoints: segment.waypoints || null
    };
  });
}

module.exports = {
  buildRoutes
};
