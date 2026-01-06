function parseWsdotDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value === "string") {
    const match = value.match(/\/Date\((\d+)([+-]\d+)?\)\//);
    if (match) {
      return new Date(Number(match[1]));
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function diffMinutes(earlier, later) {
  if (!earlier || !later) {
    return null;
  }
  return Math.round((later.getTime() - earlier.getTime()) / 60000);
}

function formatTripDate(date) {
  if (!date) {
    return null;
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = {
  parseWsdotDate,
  diffMinutes,
  formatTripDate
};
