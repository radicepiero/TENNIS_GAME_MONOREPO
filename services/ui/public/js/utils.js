export function ensureStyleLoaded(href) {
  if (![...document.styleSheets].some((sheet) => sheet.href === href)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

export function normalizeKeys(obj, keyMap) {
  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeKeys(item, keyMap));
  }

  if (obj && typeof obj === "object" && !(obj instanceof Date)) {
    const newObj = {};
    for (const key in obj) {
      const newKey = keyMap[key] || key;
      newObj[newKey] = normalizeKeys(obj[key], keyMap);
    }
    return newObj;
  }

  return obj;
}

/**
 * Genera una query string a partire da un oggetto di parametri
 * @param {Object} params - Oggetto con i parametri
 * @param {string} baseUrl - URL base
 * @returns {string} URL completo con query string
 */
export function generateQueryUrl(params = {}, baseUrl = "") {
  const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) return acc;

    // Gestione valori speciali
    if (typeof value === "boolean") {
      acc[key] = value.toString();
    } else if (Array.isArray(value)) {
      acc[key] = value.join(",");
    } else {
      acc[key] = value;
    }
    return acc;
  }, {});

  const url = new URL(baseUrl + "/trees", window.location.origin);
  url.search = new URLSearchParams(filteredParams).toString();
  return url.toString();
}
