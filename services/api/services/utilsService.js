/**
 * Converts a URL query string or full URL into a JavaScript object.
 * Handles cases where parameters appear multiple times (arrays) and preserves values as strings.
 *
 * @param {string} url - The URL or query string to parse (e.g., "https://example.com?param=value" or "?param=value" or "param=value")
 * @returns {Object} An object representing the query parameters where:
 *   - Single occurrences become properties with string values
 *   - Multiple occurrences of the same parameter become arrays
 *   - All values are strings (URLSearchParams standard behavior)
 *
 * @example
 * // Single parameter
 * parseQueryParams('?name=Sinner') // returns { name: "Sinner" }
 *
 * @example
 * // Multiple parameters
 * parseQueryParams('name=Sinner&rank=1') // returns { name: "Sinner", rank: "1" }
 *
 * @example
 * // Array parameters
 * parseQueryParams('rank=1&rank=2') // returns { rank: ["1", "2"] }
 *
 * @example
 * // Full URL
 * parseQueryParams('https://api.com/players?name=Sinner') // returns { name: "Sinner" }
 */
function parseQueryParams(url) {
  // Handle case where input is already a URL object
  if (url instanceof URL) {
    return parseQueryParams(url.search);
  }

  // Ensure we're working with a string
  const urlString = url?.toString() || "";

  // Extract query string
  let queryString;
  if (urlString.includes("?")) {
    try {
      queryString = new URL(urlString).search;
    } catch {
      // Fallback for malformed URLs
      queryString = urlString.slice(urlString.indexOf("?"));
    }
  } else if (urlString.startsWith("?")) {
    queryString = urlString;
  } else {
    queryString = `?${urlString}`;
  }

  // Parse the query string
  const params = new URLSearchParams(queryString);
  const result = {};

  for (const [key, value] of params.entries()) {
    if (key in result) {
      const current = result[key];
      result[key] = Array.isArray(current)
        ? [...current, value]
        : [current, value];
    } else {
      result[key] = value;
    }
  }

  return result;
}

function sanitizeParams(query) {
  return {
    ranking_min: !isNaN(query.ranking_min) ? Number(query.ranking_min) : 1,
    ranking_max: !isNaN(query.ranking_max) ? Number(query.ranking_max) : 100,
    includePlayer: query.includePlayer === "true",
  };
}

module.exports = {
  parseQueryParams,
  sanitizeParams,
};
