const fetch = require("node-fetch");

function buildUrl(baseUrl, path, query) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(normalizedPath, normalizedBase);
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchJson(baseUrl, path, query) {
  const url = buildUrl(baseUrl, path, query);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "take-me-home/0.1"
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WSDOT request failed (${response.status}): ${body}`);
  }


  
  return response.json();
}

module.exports = {
  fetchJson
};
