import { fetchJson } from "/js/utils.js";
import { roomApi } from "/js/api/roomApi.js";
import { getEffectiveRoomId, setSelectedRoomId } from "/js/ui/utils/roomSelection.js";

function readBootstrap() {
  const el = document.getElementById("bootstrap");
  if (!el) return {};
  try {
    return JSON.parse(el.textContent || "{}");
  } catch (e) {
    return {};
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function fmtTs(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function normalizeLinksField(raw) {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      return trimmed
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((url) => ({ url }));
    }
  }

  return trimmed
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url) => ({ url }));
}

function toYmd(v) {
  return v ? String(v).slice(0, 10) : "";
}

function renderPredictions(predictionsTable) {
  const grid = document.getElementById("predictions-grid");
  const empty = document.getElementById("predictions-empty");
  if (!grid || !empty) return;

  const pt = Array.isArray(predictionsTable) ? predictionsTable : [];
  grid.innerHTML = "";

  if (!pt.length) {
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  pt.forEach((row) => {
    const s = row && Array.isArray(row.semifinalists) ? row.semifinalists : [];
    const semiCell = (idx) => {
      const sp = s[idx];
      if (!sp) return "";
      const pts = typeof sp.puntiSemifinalist !== "undefined" ? ` (${sp.puntiSemifinalist})` : "";
      return `${sp.name}${pts}`;
    };
    const winnerCell = row && row.winner ? `${row.winner.name} (${row.winner.puntiWinner})` : "";

    const card = document.createElement("div");
    card.className = "prediction-card";
    card.innerHTML = `
      <div class="prediction-card__row">
        <div class="prediction-card__label">Creato</div>
        <div class="prediction-card__value">${fmtTs(row.created_at)}</div>
      </div>
      <div class="prediction-card__row">
        <div class="prediction-card__label">Email</div>
        <div class="prediction-card__value">${row.user_email || ""}</div>
      </div>
      <div class="prediction-card__row">
        <div class="prediction-card__label">Vincitore</div>
        <div class="prediction-card__value">${winnerCell}</div>
      </div>
      <div class="prediction-card__row">
        <div class="prediction-card__label">Semi 1</div>
        <div class="prediction-card__value">${semiCell(0)}</div>
      </div>
      <div class="prediction-card__row">
        <div class="prediction-card__label">Semi 2</div>
        <div class="prediction-card__value">${semiCell(1)}</div>
      </div>
      <div class="prediction-card__row">
        <div class="prediction-card__label">Semi 3</div>
        <div class="prediction-card__value">${semiCell(2)}</div>
      </div>
      <div class="prediction-card__row">
        <div class="prediction-card__label">Totale</div>
        <div class="prediction-card__value">${typeof row.totalPoints !== "undefined" ? row.totalPoints : ""}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

async function initPredictionsRoomSelect({ apiUrl }) {
  const select = document.getElementById("predictions-room-select");
  if (!select) return;

  let currentRoomId = getEffectiveRoomId();

  try {
    const rooms = await roomApi.getMyRooms(apiUrl);

    select.innerHTML = "";
    (rooms || []).forEach((r) => {
      const opt = document.createElement("option");
      opt.value = String(r.id);
      opt.textContent = r && r.name ? String(r.name) : String(r.id);
      select.appendChild(opt);
    });

    const roomIds = new Set(
      (rooms || [])
        .map((r) => (r && r.id !== undefined ? String(r.id) : ""))
        .filter(Boolean)
    );

    const arena = (rooms || []).find(
      (r) => r && String(r.name || "").toLowerCase() === "arena"
    );
    const arenaId = arena && arena.id !== undefined ? String(arena.id) : "";

    if (!currentRoomId || !roomIds.has(String(currentRoomId))) {
      currentRoomId = arenaId;
    }

    if (currentRoomId) {
      select.value = String(currentRoomId);
      setSelectedRoomId(String(currentRoomId));
    }

    select.addEventListener("change", () => {
      const next = select.value ? String(select.value) : "";
      setSelectedRoomId(next);
      const url = new URL(window.location.href);
      if (next) url.searchParams.set("room_id", next);
      else url.searchParams.delete("room_id");
      window.location.href = url.toString();
    });
  } catch (e) {
    // ignore
  }
}

async function fillCountries({ apiUrl }) {
  const dl = document.getElementById("countries");
  if (!dl) return;
  try {
    const tournaments = await fetchJson(`${apiUrl}/tournaments`, { method: "GET" });
    const list = Array.isArray(tournaments) ? tournaments : (tournaments && tournaments.data) || [];

    const countries = Array.from(
      new Set((list || []).map((t) => (t && t.country ? String(t.country).trim() : "")).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    dl.innerHTML = countries.map((c) => `<option value="${c}"></option>`).join("");
  } catch (e) {}
}

async function fillRankingDates({ apiUrl }) {
  const sel = document.getElementById("ranking-date");
  if (!sel) return;
  const current = sel.value || "";
  try {
    const json = await fetchJson(`${apiUrl}/rankings/dates`, { method: "GET" });
    const dates = (json && json.data) ? json.data : [];
    const normalized = (dates || []).map((d) => (d ? String(d).slice(0, 10) : "")).filter(Boolean);

    sel.innerHTML = [
      '<option value="">(vuoto)</option>',
      ...normalized.map((d) => `<option value="${d}">${d}</option>`),
    ].join("");

    sel.value = current;
  } catch (e) {}
}

async function fillScripts({ apiUrl, tournamentId }) {
  const listEl = document.getElementById("scripts-list");
  if (!listEl) return;

  try {
    const [allScriptsJson, tournamentScriptsJson] = await Promise.all([
      fetchJson(`${apiUrl}/scripts`, { method: "GET" }),
      fetchJson(`${apiUrl}/tournaments/${encodeURIComponent(tournamentId)}/scripts/`, { method: "GET" }),
    ]);

    const allScripts = (allScriptsJson && allScriptsJson.data) || [];
    const tournamentWithScripts =
      (tournamentScriptsJson && tournamentScriptsJson.data && tournamentScriptsJson.data[0]) || null;

    const selected = new Set(((tournamentWithScripts && tournamentWithScripts.Scripts) || []).map((s) => String(s && s.name)));

    listEl.innerHTML = (allScripts || [])
      .map((s) => {
        const name = String(s && s.name);
        const checked = selected.has(name) ? "checked" : "";
        return `
          <label style="display:flex; gap: 8px; align-items:center;">
            <input type="checkbox" name="scriptNames" value="${name}" ${checked} />
            <span>${name}</span>
          </label>
        `;
      })
      .join("");
  } catch (e) {}
}

async function handleSubmit({ apiUrl, tournamentId }) {
  const form = document.getElementById("form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(form));
    data.admin_links = normalizeLinksField(data.admin_links);

    const start = toYmd(data.datainizio);
    const end = toYmd(data.datafine);
    const open = toYmd(data.dataopen);
    if (open) {
      if (start && open < start) {
        alert("Data Open deve essere compresa tra Data Inizio e Data Fine");
        return;
      }
      if (end && open > end) {
        alert("Data Open deve essere compresa tra Data Inizio e Data Fine");
        return;
      }
    }

    if (data.rounds === "") delete data.rounds;
    if (data.roundopen === "") delete data.roundopen;
    if (data.ranking_date === "") delete data.ranking_date;
    if (data.dataopen === "") delete data.dataopen;

    if (data.chiusuraPronostici === "") {
      delete data.chiusuraPronostici;
    } else if (typeof data.chiusuraPronostici === "string") {
      const d = new Date(data.chiusuraPronostici);
      if (!Number.isNaN(d.getTime())) data.chiusuraPronostici = d.toISOString();
    }

    if (typeof data.rounds !== "undefined") data.rounds = Number(data.rounds);
    if (typeof data.roundopen !== "undefined") data.roundopen = Number(data.roundopen);

    if (
      typeof data.roundopen !== "undefined" &&
      typeof data.rounds !== "undefined" &&
      Number.isFinite(data.roundopen) &&
      Number.isFinite(data.rounds) &&
      data.roundopen > data.rounds
    ) {
      alert("Round Open deve essere minore o uguale a Round Totali");
      return;
    }

    try {
      await fetchJson(`${apiUrl}/tournaments/${encodeURIComponent(String(tournamentId))}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const selectedScriptNames = Array.from(document.querySelectorAll("input[name='scriptNames']:checked")).map(
        (el) => el.value
      );

      await fetchJson(`${apiUrl}/tournaments/${encodeURIComponent(String(tournamentId))}/scripts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptNames: selectedScriptNames }),
      });

      alert("Torneo aggiornato con successo!");
      location.reload();
    } catch (error) {
      alert("Errore durante l'invio della richiesta.");
      console.error(error);
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const { apiUrl, tournamentId, predictionsTable } = readBootstrap();

  renderPredictions(predictionsTable);

  await Promise.all([
    fillCountries({ apiUrl }),
    fillRankingDates({ apiUrl }),
    fillScripts({ apiUrl, tournamentId }),
    initPredictionsRoomSelect({ apiUrl }),
  ]);

  await handleSubmit({ apiUrl, tournamentId });
});
