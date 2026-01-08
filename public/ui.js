const { useEffect, useMemo, useState } = React;

function formatMinutesShort(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  if (value < 60) {
    return `${value}m`;
  }
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatClockTime(isoString) {
  if (!isoString) {
    return "-";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatUpdatedAt(isoString) {
  if (!isoString) {
    return "-";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatArrivalTime(isoString, totalMinutes) {
  if (!isoString || totalMinutes === null || totalMinutes === undefined) {
    return "-";
  }
  const base = new Date(isoString);
  if (Number.isNaN(base.getTime())) {
    return "-";
  }
  const arrival = new Date(base.getTime() + totalMinutes * 60000);
  return arrival.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function buildLegs(route) {
  const legs = [];
  const driveLegs = Array.isArray(route.drive_legs) ? route.drive_legs : [];

  if (driveLegs[0]) {
    legs.push({
      type: "drive",
      name: driveLegs[0].name || "Drive leg",
      minutes: driveLegs[0].minutes
    });
  }

  if (route.name) {
    legs.push({
      type: "ferry",
      name: route.name,
      minutes: route.ferry_crossing_minutes,
      departure: route.next_sailing_departure
    });
  }

  if (driveLegs[1]) {
    legs.push({
      type: "drive",
      name: driveLegs[1].name || "Drive leg",
      minutes: driveLegs[1].minutes
    });
  }

  return legs;
}

function App() {
  const [origin, setOrigin] = useState("port_townsend");
  const [routes, setRoutes] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: "" });

  const direction = useMemo(
    () => (origin === "port_townsend" ? "east_west" : "west_east"),
    [origin]
  );

  useEffect(() => {
    let isActive = true;

    async function loadRoutes() {
      setStatus({ loading: true, error: "" });
      const params = new URLSearchParams({ direction });

      try {
        const response = await fetch(`/v1/routes?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }
        const data = await response.json();
        if (!isActive) {
          return;
        }
        setRoutes(Array.isArray(data.routes) ? data.routes : []);
        setGeneratedAt(data.generated_at || null);
        setStatus({ loading: false, error: "" });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setStatus({ loading: false, error: error.message || "Request failed." });
      }
    }

    loadRoutes();

    return () => {
      isActive = false;
    };
  }, [direction]);

  const fastestRouteId = useMemo(() => {
    if (!routes.length) {
      return null;
    }
    const withEta = routes.filter((route) => route.total_eta_minutes !== null);
    if (!withEta.length) {
      return null;
    }
    withEta.sort((a, b) => a.total_eta_minutes - b.total_eta_minutes);
    return withEta[0].id || withEta[0].name;
  }, [routes]);

  return React.createElement(
    "div",
    { className: "app" },
    React.createElement(
      "header",
      { className: "header" },
      React.createElement(
        "div",
        { className: "brand" },
        React.createElement(
          "span",
          { className: "brand-icon", "aria-hidden": "true" },
          React.createElement(
            "svg",
            { viewBox: "0 0 20 20", role: "img", focusable: "false" },
            React.createElement("path", {
              d: "M2 10 L18 2 L12 18 L10 11 Z",
              fill: "currentColor"
            })
          )
        ),
        React.createElement("div", null, "Puget Sound Route Planner")
      ),
      React.createElement(
        "div",
        { className: "tabs" },
        React.createElement(
          "button",
          {
            type: "button",
            className: origin === "port_townsend" ? "tab active" : "tab",
            onClick: () => setOrigin("port_townsend")
          },
          "Olympic Peninsula -> Seattle"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            className: origin === "seattle" ? "tab active" : "tab",
            onClick: () => setOrigin("seattle")
          },
          "Seattle -> Olympic Peninsula"
        )
      ),
      React.createElement(
        "div",
        { className: "meta" },
        `Updated ${formatUpdatedAt(generatedAt)}`
      )
    ),
    status.loading
      ? React.createElement("div", { className: "status" }, "Updating routes...")
      : null,
    status.error
      ? React.createElement("div", { className: "status" }, `Error: ${status.error}`)
      : null,
    React.createElement(
      "div",
      { className: "routes" },
      routes.length === 0 && !status.loading && !status.error
        ? React.createElement("div", { className: "empty" }, "No route data yet.")
        : null,
      routes.map((route) =>
        React.createElement(
          "div",
          {
            className:
              (route.id || route.name) === fastestRouteId
                ? "route-card fastest"
                : "route-card",
            key: route.id || route.name
          },
          React.createElement(
            "div",
            { className: "route-header" },
            React.createElement(
              "div",
              { className: "route-title" },
              React.createElement(
                "div",
                { className: "icon-bubble" },
                "F"
              ),
              React.createElement(
                "div",
                null,
                React.createElement("div", { className: "title-text" }, route.name || "Route"),
                React.createElement(
                  "div",
                  { className: "eta-line" },
                  React.createElement(
                    "span",
                    { className: "eta-time" },
                    formatMinutesShort(route.total_eta_minutes)
                  ),
                  React.createElement(
                    "span",
                    { className: "eta-arrival" },
                    `Arrive ~ ${formatArrivalTime(generatedAt, route.total_eta_minutes)}`
                  ),
                  (route.id || route.name) === fastestRouteId
                    ? React.createElement("span", { className: "badge" }, "Fastest")
                    : null
                )
              )
            )
          ),
          React.createElement(
            "div",
            { className: "route-body" },
            buildLegs(route).map((leg, index) =>
              React.createElement(
                "div",
                { className: "leg", key: `${route.id || route.name}-leg-${index}` },
                React.createElement(
                  "div",
                  { className: "leg-main" },
                  React.createElement(
                    "div",
                    { className: `leg-icon ${leg.type}` },
                    leg.type === "ferry" ? "F" : "D"
                  ),
                  React.createElement(
                    "div",
                    null,
                    React.createElement("div", { className: "leg-name" }, leg.name),
                    leg.departure
                      ? React.createElement(
                        "div",
                        { className: "leg-meta" },
                        `Next departure: ${formatClockTime(leg.departure)}`
                      )
                      : null
                  )
                ),
                React.createElement(
                  "div",
                  { className: "leg-time" },
                  formatMinutesShort(leg.minutes)
                )
              )
            ),
            route.data_status === "missing_access_code"
              ? React.createElement(
                "div",
                { className: "route-note" },
                "WSDOT access code missing. Ferry timing data is unavailable."
              )
              : null
          )
        )
      )
    ),
    React.createElement(
      "div",
      { className: "footnote" },
      "Note: Ferry departure times are estimated. Always verify current schedules with Washington State Ferries. Drive times are approximate and may vary with traffic."
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
