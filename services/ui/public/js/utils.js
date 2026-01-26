export function ensureStyleLoaded(href) {
  if (![...document.styleSheets].some((sheet) => sheet.href === href)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

export async function fetchJson(url, options = {}, cfg = {}) {
  const allowStatus = cfg && Array.isArray(cfg.allowStatus) ? cfg.allowStatus : [];
  const buildErrorMessage = cfg && typeof cfg.buildErrorMessage === "function" ? cfg.buildErrorMessage : null;
  const res = await fetch(url, { credentials: "include", ...(options || {}) });
  if (allowStatus.includes(res.status)) return null;
  if (!res.ok) {
    let json = null;
    let text = "";
    try {
      json = await res.json();
    } catch (e) {
      text = await res.text().catch(() => "");
    }

    let msg = "";
    if (buildErrorMessage) {
      msg = String(buildErrorMessage({ status: res.status, url, json, text }) || "");
    }
    if (!msg) {
      msg = json && (json.message || json.error) ? (json.message || json.error) : (json ? JSON.stringify(json) : text);
    }

    throw new Error(`HTTP ${res.status} ${url} ${msg}`);
  }
  return await res.json();
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

export function unwrapData(json) {
  return json && typeof json === "object" && "data" in json ? json.data : json;
}

export function unwrapFirst(json) {
  const data = unwrapData(json);
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export function normalizeYmd(v) {
  if (!v) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function formatDmyShort(v) {
  const ymd = normalizeYmd(v);
  if (!ymd) return "";
  if (ymd.length < 10) return ymd;
  const [yyyy, mm, dd] = ymd.split("-");
  if (!yyyy || !mm || !dd) return ymd;
  return `${dd}-${mm}-${String(yyyy).slice(-2)}`;
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
