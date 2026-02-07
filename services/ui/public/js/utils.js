/**
 * Carica un foglio di stile una sola volta (se non già presente in document.styleSheets).
 * @param {string} href
 */
export function ensureStyleLoaded(href) {
  if (![...document.styleSheets].some((sheet) => sheet.href === href)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

/**
 * Wrapper per fetch che restituisce JSON (o null) con gestione robusta di:
 * - risposta 204
 * - body vuoto
 * - allowStatus: status che non devono sollevare errore (ritorna null)
 *
 * Nota: usa sempre `credentials: "include"` per supportare autenticazione via cookie.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @param {{
 *  allowStatus?: number[],
 *  buildErrorMessage?: (ctx: {status:number, url:string, json:any, text:string}) => string
 * }} [cfg]
 * @returns {Promise<any|null>}
 */
export async function fetchJson(url, options = {}, cfg = {}) {
  const allowStatus = cfg && Array.isArray(cfg.allowStatus) ? cfg.allowStatus : [];
  const buildErrorMessage = cfg && typeof cfg.buildErrorMessage === "function" ? cfg.buildErrorMessage : null;
  const res = await fetch(url, { credentials: "include", ...(options || {}) });
  if (allowStatus.includes(res.status)) return null;
  if (res.status === 204) return null;
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
  const text = await res.text().catch(() => "");
  if (!String(text || "").trim()) return null;
  return JSON.parse(text);
}

/**
 * Rinomina ricorsivamente le chiavi di un oggetto/array secondo una mappa.
 * Utile per normalizzare payload API (snake_case -> camelCase, ecc.).
 *
 * @param {any} obj
 * @param {Record<string,string>} keyMap
 * @returns {any}
 */
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
 * Se il payload ha forma { data: ... } ritorna .data, altrimenti ritorna json.
 * @param {any} json
 * @returns {any}
 */
export function unwrapData(json) {
  return json && typeof json === "object" && "data" in json ? json.data : json;
}

/**
 * Come unwrapData, ma se il risultato è un array ritorna il primo elemento.
 * @param {any} json
 * @returns {any|null}
 */
export function unwrapFirst(json) {
  const data = unwrapData(json);
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

/**
 * Alias rapido per document.getElementById.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Imposta il testo di un elemento in modo safe (null-check).
 * @param {HTMLElement|null} el
 * @param {string} text
 */
export function setText(el, text) {
  if (!el) return;
  el.textContent = text || "";
}

/**
 * Normalizza una data a formato YYYY-MM-DD (primi 10 char), se possibile.
 * @param {string|Date|null|undefined} v
 * @returns {string|null}
 */
export function normalizeYmd(v) {
  if (!v) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/**
 * Formatta una data in DD-MM-YY a partire da YYYY-MM-DD.
 * @param {string|Date|null|undefined} v
 * @returns {string}
 */
export function formatDmyShort(v) {
  const ymd = normalizeYmd(v);
  if (!ymd) return "";
  if (ymd.length < 10) return ymd;
  const [yyyy, mm, dd] = ymd.split("-");
  if (!yyyy || !mm || !dd) return ymd;
  return `${dd}-${mm}-${String(yyyy).slice(-2)}`;
}

/**
 * Converte un input datetime-local (o string compatibile) in ISO string.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function localDateTimeToIso(value) {
  if (!value) return null;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Estrae l'anno (YYYY) da una stringa data.
 * @param {string|null|undefined} dateStr
 * @returns {string}
 */
export function toYear(dateStr) {
  if (!dateStr) return "";
  const ymd = normalizeYmd(dateStr);
  if (!ymd || ymd.length < 4) return "";
  return ymd.slice(0, 4);
}

/**
 * Estrae lo status HTTP da un errore generato da fetchJson (pattern: "HTTP 404 ...").
 * @param {any} err
 * @returns {number|null}
 */
export function parseHttpStatusFromError(err) {
  const msg = err && err.message ? String(err.message) : "";
  const m = msg.match(/HTTP\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

/**
 * Estrae il corpo di una funzione JavaScript data come stringa.
 * @param {string} fnString
 * @returns {string}
 */
export function extractJsFunctionBody(fnString) {
  const match = String(fnString || "").match(/{([\s\S]*)}/);
  return match ? match[1].trim() : "";
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
