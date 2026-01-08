const { useEffect, useMemo, useState } = React;

function formatMinutes(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  if (value < 60) {
    return `${value} min`;
  }
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function formatDate(isoString) {
  if (!isoString) {
    return "-";
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
}

function formatDriveLegs(legs) {
  if (!Array.isArray(legs) || legs.length === 0) {
    return "-";
  }
  return legs
    .map((leg) => `${leg.name || "Leg"}: ${formatMinutes(leg.minutes)}`)
    .join("\n");
}

function buildDepartAt(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function App() {
  const [origin, setOrigin] = useState("port_townsend");
  const [departAt, setDepartAt] = useState("");
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
      const departAtIso = buildDepartAt(departAt);
      const params = new URLSearchParams({ direction });
      if (departAtIso) {
        params.set("depart_at", departAtIso);
      }

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
  }, [departAt, direction]);

  return React.createElement(
    "div",
    { className: "app" },
    React.createElement("h1", null, "Take Me Home"),
    React.createElement(
      "p",
      { className: "lede" },
      "Pick where you are leaving from to see the next route options and timing estimates."
    ),
    React.createElement(
      "form",
      {
        onSubmit: (event) => {
          event.preventDefault();
        }
      },
      React.createElement(
        "label",
        null,
        "Leaving from",
        React.createElement(
          "select",
          {
            value: origin,
            onChange: (event) => setOrigin(event.target.value)
          },
          React.createElement(
            "option",
            { value: "port_townsend" },
            "Port Townsend"
          ),
          React.createElement(
            "option",
            { value: "seattle" },
            "Seattle"
          )
        )
      ),
      React.createElement(
        "label",
        null,
        "Depart at (optional)",
        React.createElement("input", {
          type: "datetime-local",
          value: departAt,
          onChange: (event) => setDepartAt(event.target.value)
        })
      ),
      React.createElement(
        "label",
        null,
        "Direction",
        React.createElement(
          "input",
          {
            type: "text",
            value: direction === "east_west" ? "Port Townsend to Seattle" : "Seattle to Port Townsend",
            readOnly: true
          }
        )
      )
    ),
    React.createElement(
      "div",
      { className: "meta" },
      `Generated: ${formatDate(generatedAt)}`
    ),
    status.loading
      ? React.createElement("div", { className: "status" }, "Loading routes...")
      : null,
    status.error
      ? React.createElement("div", { className: "status" }, `Error: ${status.error}`)
      : null,
    React.createElement(
      "div",
      { className: "routes" },
      routes.length === 0 && !status.loading && !status.error
        ? React.createElement("div", null, "No route data yet.")
        : null,
      routes.map((route) =>
        React.createElement(
          "div",
          { className: "route-card", key: route.id || route.name },
          React.createElement("div", { className: "route-title" }, route.name || "Route"),
          React.createElement(
            "div",
            { className: "route-grid" },
            React.createElement(
              "div",
              null,
              "Total ETA",
              React.createElement("span", null, formatMinutes(route.total_eta_minutes))
            ),
            React.createElement(
              "div",
              null,
              "Drive time",
              React.createElement("span", null, formatMinutes(route.drive_time_minutes))
            ),
            React.createElement(
              "div",
              null,
              "Driving legs",
              React.createElement(
                "span",
                { style: { whiteSpace: "pre-line" } },
                formatDriveLegs(route.drive_legs)
              )
            ),
            React.createElement(
              "div",
              null,
              "Ferry wait",
              React.createElement("span", null, formatMinutes(route.ferry_wait_minutes))
            ),
            React.createElement(
              "div",
              null,
              "Crossing time",
              React.createElement("span", null, formatMinutes(route.ferry_crossing_minutes))
            ),
            React.createElement(
              "div",
              null,
              "Next departure",
              React.createElement(
                "span",
                null,
                formatDate(route.next_sailing_departure)
              )
            ),
            React.createElement(
              "div",
              null,
              "Schedule count",
              React.createElement(
                "span",
                null,
                route.schedule_count === undefined || route.schedule_count === null
                  ? "-"
                  : route.schedule_count
              )
            )
          ),
          route.components && route.components.length
            ? React.createElement(
              "div",
              { className: "note" },
              `Includes: ${route.components.join(" + ")}`
            )
            : null,
          route.data_status === "missing_access_code"
            ? React.createElement(
              "div",
              { className: "note" },
              "WSDOT access code missing. Ferry timing data is unavailable."
            )
            : null
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
