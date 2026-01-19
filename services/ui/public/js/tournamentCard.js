const superuserTreeExistsCacheByApi = new Map();

function getSuperuserCache(apiUrl) {
  const key = String(apiUrl || "");
  if (!superuserTreeExistsCacheByApi.has(key)) {
    superuserTreeExistsCacheByApi.set(key, new Map());
  }
  return superuserTreeExistsCacheByApi.get(key);
}

let supportsFlagEmojiCache = null;
function supportsFlagEmoji() {
  if (supportsFlagEmojiCache !== null) return supportsFlagEmojiCache;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return (supportsFlagEmojiCache = false);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "28px sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("🇮🇹", 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let nonZero = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) {
        nonZero++;
        if (nonZero > 10) break;
      }
    }
    supportsFlagEmojiCache = nonZero > 10;
    return supportsFlagEmojiCache;
  } catch (e) {
    supportsFlagEmojiCache = false;
    return false;
  }
}

function countryToFlag(countryRaw) {
  const c = String(countryRaw || "").trim().toLowerCase();
  const map = {
    italia: "IT",
    australia: "AU",
    spagna: "ES",
    francia: "FR",
    germania: "DE",
    olanda: "NL",
    monaco: "MC",
    qatar: "QA",
    "stati uniti": "US",
    argentina: "AR",
    brasile: "BR",
    canada: "CA",
    cina: "CN",
    giappone: "JP",
    regno: "GB",
    "regno unito": "GB",
    svezia: "SE",
    svizzera: "CH",
    emirati: "AE",
    "emirati arabi": "AE",
    "emirati arabi uniti": "AE",
  };
  const direct = c.length === 2 ? c.toUpperCase() : "";
  const code = direct || map[c] || "";
  if (!code || code.length !== 2) return "";
  if (!supportsFlagEmoji()) return code;
  const A = 0x1f1e6;
  const pts = code
    .toUpperCase()
    .split("")
    .map((ch) => A + ch.charCodeAt(0) - 65);
  return String.fromCodePoint(...pts);
}

function normalizeYmd(v) {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatDmyShort(v) {
  const ymd = normalizeYmd(v);
  if (!ymd || ymd.length < 10) return ymd;
  const [yyyy, mm, dd] = ymd.split("-");
  if (!yyyy || !mm || !dd) return ymd;
  return `${dd}-${mm}-${String(yyyy).slice(-2)}`;
}

function getTournamentStatus(t) {
  return t && t.status ? String(t.status).toLowerCase() : "";
}

function statusLabel(statusRaw) {
  const st = String(statusRaw || "").toLowerCase();
  if (st === "excluded") return "torneo escluso dal gioco";
  if (st === "open") return "Fai il tuo pronostico";
  if (st === "in-progress") return "Segui i risultati dei pronostici";
  if (st === "completed") return "Verifica il punteggio";
  return st;
}

function statusHref(t) {
  const st = getTournamentStatus(t);
  if (st === "open") return `/tornei/${t.id}/pronostico`;
  if (st === "in-progress" || st === "completed") return `/tornei/${t.id}/sviluppo`;
  return "";
}

function statusShadowClass(status) {
  const st = status ? String(status).toLowerCase() : "";
  if (st === "upcoming") return "tournament-card--shadow-upcoming";
  if (st === "open") return "tournament-card--shadow-open";
  if (st === "in-progress") return "tournament-card--shadow-in-progress";
  return "";
}

function surfaceBackgroundClass(surfaceRaw) {
  const s = String(surfaceRaw || "").toLowerCase();
  if (s.includes("grass")) return "tournament-card--surface-grass";
  if (s.includes("clay")) return "tournament-card--surface-clay";
  if (s.includes("hard")) return "tournament-card--surface-hard";
  if (s.includes("carpet")) return "tournament-card--surface-carpet";
  return "tournament-card--surface-other";
}

async function checkSuperuserTreeExists(apiUrl, tournamentId) {
  const cache = getSuperuserCache(apiUrl);
  const key = String(tournamentId);
  if (cache.has(key)) {
    const v = cache.get(key);
    return typeof v === "boolean" ? v : await v;
  }

  const p = (async () => {
    try {
      const res = await fetch(`${apiUrl}/trees/superuser/${encodeURIComponent(tournamentId)}`, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      return Boolean(json && (json.id || json.uuid));
    } catch (e) {
      return false;
    }
  })();

  cache.set(key, p);
  const ok = await p;
  cache.set(key, ok);
  return ok;
}

export function buildTournamentCard(tournament, { apiUrl } = {}) {
  const container = document.createElement("div");
  container.className = [
    "tournament-card",
    statusShadowClass(tournament.status),
    surfaceBackgroundClass(tournament.surface),
  ]
    .filter(Boolean)
    .join(" ");

  const header = document.createElement("div");
  header.className = "tournament-card__header";
  header.style.backgroundImage = tournament.image ? `url('${tournament.image}')` : "none";

  const category = document.createElement("div");
  category.className = "tournament-card__category";
  category.textContent = `${tournament.category || ""}`;

  const title = document.createElement("div");
  title.className = "tournament-card__title";
  title.textContent = String(tournament.nickname || tournament.name || "").trim();

  const meta = document.createElement("div");
  meta.className = "tournament-card__meta";

  const statusText = statusLabel(tournament.status);
  const href = statusHref(tournament);
  const statusEl = href
    ? `<a class="tournament-status-link" href="${href}">${statusText}</a>`
    : `<button type="button" class="tournament-status-link tournament-status-link--disabled" aria-disabled="true">${statusText}</button>`;

  const city = tournament.location || "";
  const country = tournament.country || "";
  const flag = countryToFlag(country);
  const where = city || country
    ? `<span class="tournament-where" data-country-wrap><span class="tournament-city">${city}</span><button type="button" class="tournament-flag" data-country-toggle aria-label="Nazione">${flag}</button><span class="tournament-country is-hidden" data-country-name>${country}</span></span>`
    : "";

  const openRow = tournament.dataopen ? `<div>open: ${formatDmyShort(tournament.dataopen)}</div>` : "";

  const st = getTournamentStatus(tournament);
  const maybeEasyWin = st === "open"
    ? `<a class="tournament-status-link tournament-easywin-btn is-hidden" data-easywin-btn data-tournament-id="${tournament.id}" href="/tornei/${tournament.id}/albero-pronostico">usa il tabellone per vincere facile</a>`
    : "";

  const superLabel = st === "open" ? "tabellone" : "guarda i risultati";
  const superBtn = `<a class="tournament-status-link tournament-superuser-tree-btn is-hidden" data-superuser-tree-btn data-tournament-id="${tournament.id}" href="/tornei/${tournament.id}/albero-superuser">${superLabel}</a>`;

  meta.innerHTML = `
    <div>${statusEl}</div>
    ${maybeEasyWin}
    ${superBtn}
    <div>dal ${formatDmyShort(tournament.datainizio)} al ${formatDmyShort(tournament.datafine)}</div>
    ${openRow}
    <div>${where}</div>
  `;

  header.appendChild(category);
  header.appendChild(title);
  header.appendChild(meta);
  container.appendChild(header);

  container.addEventListener("click", (e) => {
    const btn = e.target && e.target.closest ? e.target.closest("[data-country-toggle]") : null;
    if (!btn) return;
    const wrap = btn.closest("[data-country-wrap]");
    if (!wrap) return;
    const name = wrap.querySelector("[data-country-name]");
    if (!name) return;
    name.classList.toggle("is-hidden");
  });

  {
    const easywinBtn = meta.querySelector("[data-easywin-btn]");
    const superTreeBtn = meta.querySelector("[data-superuser-tree-btn]");
    const maybeHasSuperTree = typeof tournament.hasSuperTree === "boolean" ? tournament.hasSuperTree : null;

    const applyExists = (exists) => {
      if (!exists) return;
      if (superTreeBtn) superTreeBtn.classList.remove("is-hidden");
      if (st === "open") {
        if (easywinBtn) easywinBtn.classList.remove("is-hidden");
      }
    };

    if (maybeHasSuperTree === true) {
      applyExists(true);
    } else if (maybeHasSuperTree === false) {
    } else if (apiUrl) {
      checkSuperuserTreeExists(apiUrl, tournament.id).then((exists) => applyExists(exists));
    }
  }

  return container;
}
