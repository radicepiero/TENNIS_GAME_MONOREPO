import { fetchJson } from "./utils.js";

function $(id) {
  return document.getElementById(id);
}

function setText(el, text) {
  if (!el) return;
  el.textContent = text;
}

function toYmd(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  if (s.length >= 10) return s.slice(0, 10);
  return s;
}

function formatDateItUtc(value) {
  const ymd = toYmd(value);
  if (!ymd || ymd.length !== 10) return ymd;
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

function toYear(dateStr) {
  if (!dateStr) return "";
  const m = toYmd(dateStr).match(/^(\d{4})-/);
  return m ? m[1] : "";
}

function rowHtml(t) {
  const safe = (v) => (v === null || typeof v === "undefined" ? "" : String(v));
  const tree = t && t._tree ? t._tree : null;
  const treeLabel = tree ? "Apri albero" : "Genera albero";
  const treeName = tree && tree.name ? String(tree.name) : "";
  const nickname = t && t.nickname ? String(t.nickname) : "";
  const predCount = Number(t && t._predictionsCount);
  const predCountText = Number.isFinite(predCount) ? String(predCount) : "0";
  const actionsHtml = `
        <a href="/tornei/${safe(t.id)}/edit">Modifica</a>
        <button data-action="delete" data-id="${safe(t.id)}" style="margin-left: 10px;">Elimina</button>
      `;

  return `
    <tr data-id="${safe(t.id)}">
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(t.id)}</td>
      <td style="border-bottom: 1px solid #eee; padding: 8px;">
        <div>${safe(t.name)}</div>
        ${nickname ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${safe(nickname)}</div>` : ""}
      </td>
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(formatDateItUtc(t.datainizio))}</td>
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(formatDateItUtc(t.datafine))}</td>
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(t.status)}</td>
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${predCountText}</td>
      <td style="border-bottom: 1px solid #eee; padding: 8px;">
        <a href="/tornei/${safe(t.id)}/genera-albero">${safe(treeLabel)}</a>
        ${treeName ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${safe(treeName)}</div>` : ""}
      </td>
      <td style="border-bottom: 1px solid #eee; padding: 8px; white-space: nowrap;">
        ${actionsHtml}
      </td>
    </tr>
  `;
}

async function apiFetch(url, options = {}) {
  return await fetchJson(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

function parseHttpStatusFromError(err) {
  const msg = err && err.message ? String(err.message) : "";
  const m = msg.match(/HTTP\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

async function loadTrees(apiUrl) {
  try {
    const json = await apiFetch(`${apiUrl}/trees?includeMatches=false`, { method: "GET" });
    return Array.isArray(json) ? json : [];
  } catch (e) {
    return [];
  }
}

async function loadPredictionCounts(apiUrl) {
  try {
    const json = await apiFetch(`${apiUrl}/predictions/counts/tournaments`, { method: "GET" });
    return (json && json.data) || [];
  } catch (e) {
    return [];
  }
}

async function loadRankingDates(apiUrl) {
  try {
    const json = await apiFetch(`${apiUrl}/rankings/dates`, { method: "GET" });
    return (json && json.data) || [];
  } catch (e) {
    return [];
  }
}

function fillRankingDatesSelect(selectEl, dates) {
  if (!selectEl) return;
  const current = selectEl.value || "";
  const opts = [
    `<option value="">(vuoto)</option>`,
    ...(dates || []).map((d) => {
      const ymd = toYmd(d);
      return `<option value="${ymd}">${ymd}</option>`;
    }),
  ];
  selectEl.innerHTML = opts.join("");
  selectEl.value = current;
}

function updateCountriesDatalist(tournaments) {
  const dl = document.getElementById("countries");
  if (!dl) return;

  const countries = Array.from(
    new Set(
      (tournaments || [])
        .map((t) => (t && t.country ? String(t.country).trim() : ""))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  dl.innerHTML = countries.map((c) => `<option value="${c}"></option>`).join("");
}

function setupCreateModal() {
  const modal = document.getElementById("create-modal");
  const overlay = document.getElementById("create-modal-overlay");
  const openBtn = document.getElementById("open-create");
  const closeBtn = document.getElementById("close-create");
  const cancelBtn = document.getElementById("cancel-create");
  const form = document.getElementById("create-tournament");
  const createStatus = document.getElementById("create-status");

  if (!modal || !openBtn || !form) return { open: () => {}, close: () => {} };

  function open() {
    modal.style.display = "block";
    if (typeof createStatus !== "undefined" && createStatus) createStatus.textContent = "";
    const first = form.querySelector("input, select, textarea");
    if (first) first.focus();
  }

  function close() {
    modal.style.display = "none";
    if (typeof createStatus !== "undefined" && createStatus) createStatus.textContent = "";
  }

  openBtn.addEventListener("click", open);
  if (overlay) overlay.addEventListener("click", close);
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (cancelBtn) cancelBtn.addEventListener("click", close);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display !== "none") {
      close();
    }
  });

  return { open, close };
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("admin-tournaments");
  if (!root) return;

  const apiUrl = root.dataset.apiUrl || "/api";

  const rankingImportDate = document.getElementById("ranking-import-date");
  const rankingImportFile = document.getElementById("ranking-import-file");
  const rankingImportRun = document.getElementById("ranking-import-run");
  const rankingImportStatus = document.getElementById("ranking-import-status");

  const form = document.getElementById("create-tournament");
  const createStatus = document.getElementById("create-status");
  const rankingDateSelect = document.getElementById("ranking-date");

  const createModal = setupCreateModal();

  const filterName = document.getElementById("filter-name");
  const filterYear = document.getElementById("filter-year");
  const reloadBtn = document.getElementById("reload");
  const listStatus = document.getElementById("list-status");

  const tbody = document.querySelector("#tournaments-table tbody");

  let all = [];
  let rankingDates = [];

  async function runRankingImport() {
    if (!rankingImportRun || !rankingImportFile || !rankingImportDate) return;
    const file = rankingImportFile.files && rankingImportFile.files[0];
    const date = rankingImportDate.value;
    if (!file) {
      setText(rankingImportStatus, "Seleziona un file CSV");
      return;
    }
    if (!date) {
      setText(rankingImportStatus, "Seleziona la ranking date");
      return;
    }

    setText(rankingImportStatus, "Upload... ");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("ranking_date", date);

      const json = await fetchJson(
        `${apiUrl}/rankings/import-csv`,
        {
          method: "POST",
          body: fd,
          credentials: "include",
        },
        {
          buildErrorMessage: ({ json }) => (json && (json.message || json.error)) || "",
        }
      );

      const data = json && json.data ? json.data : null;
      if (data) {
        setText(
          rankingImportStatus,
          `OK (righe: ${data.rows}, players nuovi: ${data.createdPlayers}, rankings: ${data.createdRankings})`
        );
      } else {
        setText(rankingImportStatus, "OK");
      }

      rankingImportFile.value = "";
      try {
        rankingDates = await loadRankingDates(apiUrl);
        fillRankingDatesSelect(rankingDateSelect, rankingDates);
      } catch (e) {}
    } catch (e) {
      setText(rankingImportStatus, "Errore import");
    }
  }

  function applyFilters() {
    const nameQ = (filterName.value || "").toLowerCase();
    const yearQ = filterYear.value || "";

    const filtered = all.filter((t) => {
      const haystack = `${String(t.name || "")} ${String(t.nickname || "")}`.toLowerCase();
      const okName = !nameQ || haystack.includes(nameQ);
      const y = toYear(t.datafine || t.datainizio);
      const okYear = !yearQ || y === yearQ;
      return okName && okYear;
    });

    tbody.innerHTML = filtered.map(rowHtml).join("");
  }

  async function load() {
    setText(listStatus, "Caricamento...");
    try {
      try {
        rankingDates = await loadRankingDates(apiUrl);
        fillRankingDatesSelect(rankingDateSelect, rankingDates);
      } catch (e) {
        rankingDates = [];
        fillRankingDatesSelect(rankingDateSelect, []);
      }

      try {
        const json = await apiFetch(`${apiUrl}/tournaments`, { method: "GET" });
        all = Array.isArray(json) ? json : [];
      } catch (e) {
        const st = parseHttpStatusFromError(e);
        setText(listStatus, `Errore: ${st || ""}`.trim());
        return;
      }

      let predCounts = [];
      try {
        predCounts = await loadPredictionCounts(apiUrl);
      } catch (e) {
        predCounts = [];
      }
      const countByTournamentId = new Map(
        (predCounts || []).map((r) => [String(r.tournament_id), Number(r.count) || 0])
      );

      let trees = [];
      try {
        trees = await loadTrees(apiUrl);
      } catch (e) {
        trees = [];
      }

      const treeByTournamentId = new Map();
      for (const tr of trees || []) {
        const tid = tr && (tr.tournament || tr.tournamentId);
        if (!tid) continue;
        if (!treeByTournamentId.has(String(tid))) {
          treeByTournamentId.set(String(tid), tr);
        }
      }
      all = all.map((t) => ({
        ...t,
        _tree: treeByTournamentId.get(String(t.id)) || null,
        _predictionsCount: countByTournamentId.get(String(t.id)) || 0,
      }));

      updateCountriesDatalist(all);
      applyFilters();
      setText(listStatus, `OK (${all.length})`);
    } catch (e) {
      setText(listStatus, "Errore caricamento");
    }
  }

  filterName.addEventListener("input", applyFilters);
  filterYear.addEventListener("change", applyFilters);
  reloadBtn.addEventListener("click", load);
  if (rankingImportRun) rankingImportRun.addEventListener("click", runRankingImport);

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action='delete']");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    const ok = confirm(`Eliminare torneo ${id}?`);
    if (!ok) return;

    setText(listStatus, "Eliminazione...");
    try {
      try {
        const prJson = await fetchJson(
          `${apiUrl}/predictions/tournaments/${id}`,
          { method: "GET", credentials: "include" },
          { allowStatus: [404] }
        );
        const preds = (prJson && prJson.data) || [];
        const avatarUrls = (preds || [])
          .map((p) => (p && p.avatar_url ? String(p.avatar_url) : ""))
          .filter((u) => u && u.startsWith("/uploads/predictions/"));

        if (avatarUrls.length > 0) {
          await fetchJson(
            "/pronostico/delete-avatars",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ avatar_urls: avatarUrls }),
              credentials: "include",
            },
            { allowStatus: [404] }
          ).catch(() => null);
        }
      } catch (e3) {}

      try {
        await apiFetch(`${apiUrl}/tournaments/${id}`, { method: "DELETE" });
      } catch (e) {
        const st = parseHttpStatusFromError(e);
        setText(listStatus, `Errore delete: ${st || ""}`.trim());
        return;
      }
      all = all.filter((t) => String(t.id) !== String(id));
      applyFilters();
      setText(listStatus, "Eliminato");
    } catch (e2) {
      setText(listStatus, "Errore delete");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setText(createStatus, "Creazione...");

    const data = Object.fromEntries(new FormData(form));

    // normalize numeric fields
    if (typeof data.prizemoney !== "undefined") data.prizemoney = Number(data.prizemoney);
    if (typeof data.rounds !== "undefined" && data.rounds !== "") data.rounds = Number(data.rounds);
    if (data.rounds === "") delete data.rounds;
    if (typeof data.costopartecipazione !== "undefined") data.costopartecipazione = Number(data.costopartecipazione);
    if (data.ranking_date === "") delete data.ranking_date;
    if (typeof data.ranking_date === "string") data.ranking_date = toYmd(data.ranking_date);

    if (data.chiusuraPronostici === "") {
      delete data.chiusuraPronostici;
    } else if (typeof data.chiusuraPronostici === "string") {
      const d = new Date(data.chiusuraPronostici);
      if (!Number.isNaN(d.getTime())) data.chiusuraPronostici = d.toISOString();
    }

    try {
      let created;
      try {
        created = await apiFetch(`${apiUrl}/tournaments`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      } catch (e1) {
        const st = parseHttpStatusFromError(e1);
        setText(createStatus, `Errore: ${st || ""}`.trim());
        return;
      }
      all = [...all, created];
      applyFilters();
      form.reset();
      setText(createStatus, "Creato");
      createModal.close();
    } catch (err) {
      setText(createStatus, "Errore creazione");
    }
  });

  load();
});
