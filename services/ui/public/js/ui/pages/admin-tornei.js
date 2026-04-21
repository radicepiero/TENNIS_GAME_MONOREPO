import {
  normalizeYmd,
  formatDmyShort,
  localDateTimeToIso,
  toYear,
  parseHttpStatusFromError,
  setText,
} from "/js/utils.js";

import { roundLabels } from "/js/icons.js";

import { treeApi } from "/js/api/treeApi.js";
import { predictionApi } from "/js/api/predictionApi.js";
import { rankingApi } from "/js/api/rankingApi.js";
import { tournamentApi } from "/js/api/tournamentApi.js";
import { pronosticoApi } from "/js/api/pronosticoApi.js";

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
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(formatDmyShort(t.datainizio))}</td>
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(formatDmyShort(t.datafine))}</td>
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

function fillRankingDatesSelect(selectEl, dates) {
  if (!selectEl) return;
  const current = selectEl.value || "";
  const opts = [
    `<option value="">(vuoto)</option>`,
    ...(dates || []).map((d) => {
      const ymd = normalizeYmd(d) || "";
      return `<option value="${ymd}">${ymd}</option>`;
    }),
  ];
  selectEl.innerHTML = opts.join("");
  selectEl.value = current;
}

function fillRoundsSelect(selectEl) {
  if (!selectEl) return;
  const current = selectEl.value || "";

  // roundLabels: ["Pronostici", "128-esimi", ..., "Finale"]
  // Nella UI admin vogliamo escludere "Pronostici" e mappare:
  // 1 -> Finale, 2 -> Semifinali, ..., 8 -> 128-esimi
  const opts = [`<option value="">(vuoto)</option>`];
  const maxRound = roundLabels.length - 1;
  for (let value = 1; value <= maxRound; value += 1) {
    const label = roundLabels[roundLabels.length - value];
    opts.push(`<option value="${value}">${label} (${value})</option>`);
  }

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
  const roundsSelect = document.getElementById("rounds");

  const createModal = setupCreateModal();

  const filterName = document.getElementById("filter-name");
  const filterYear = document.getElementById("filter-year");
  const reloadBtn = document.getElementById("reload");
  const listStatus = document.getElementById("list-status");

  const tbody = document.querySelector("#tournaments-table tbody");

  let all = [];
  let rankingDates = [];

  fillRoundsSelect(roundsSelect);

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
      const json = await rankingApi.importRankingsCsv(file, date, apiUrl);

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
        rankingDates = await rankingApi.getRankingDates(apiUrl);
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
        rankingDates = await rankingApi.getRankingDates(apiUrl);
        fillRankingDatesSelect(rankingDateSelect, rankingDates);
      } catch (e) {
        rankingDates = [];
        fillRankingDatesSelect(rankingDateSelect, []);
      }

      try {
        all = await tournamentApi.listTournaments(apiUrl);
      } catch (e) {
        const st = parseHttpStatusFromError(e);
        setText(listStatus, `Errore: ${st || ""}`.trim());
        return;
      }

      let predCounts = [];
      try {
        predCounts = await predictionApi.getPredictionCountsByTournament(apiUrl);
      } catch (e) {
        predCounts = [];
      }
      const countByTournamentId = new Map(
        (predCounts || []).map((r) => [String(r.tournament_id), Number(r.count) || 0])
      );

      let trees = [];
      try {
        const json = await treeApi.getTrees({ includeMatches: false }, apiUrl);
        trees = Array.isArray(json) ? json : [];
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
        const preds = await predictionApi.getTournamentPredictions(id, apiUrl);
        const avatarUrls = (preds || [])
          .map((p) => (p && p.avatar_url ? String(p.avatar_url) : ""))
          .filter((u) => u && u.startsWith("/uploads/predictions/"));

        if (avatarUrls.length > 0) {
          await pronosticoApi.deleteAvatars(avatarUrls).catch(() => null);
        }
      } catch (e3) {}

      try {
        await tournamentApi.deleteTournament(id, apiUrl);
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

    const material = data.surface_material ? String(data.surface_material).toLowerCase() : "hard";
    const indoor = Boolean(data.surface_indoor);
    const color = data.surface_color ? String(data.surface_color).trim() : "";
    data.surface_jsonb = {
      material,
      indoor,
      color: color || null,
    };
    delete data.surface_material;
    delete data.surface_indoor;
    delete data.surface_color;

    // normalize numeric fields
    if (typeof data.prizemoney !== "undefined") data.prizemoney = Number(data.prizemoney);
    if (typeof data.rounds !== "undefined" && data.rounds !== "") data.rounds = Number(data.rounds);
    if (data.rounds === "") delete data.rounds;
    if (typeof data.costopartecipazione !== "undefined") data.costopartecipazione = Number(data.costopartecipazione);
    if (data.ranking_date === "") delete data.ranking_date;
    if (typeof data.ranking_date === "string") data.ranking_date = normalizeYmd(data.ranking_date);

    if (data.chiusuraPronostici === "") {
      delete data.chiusuraPronostici;
    } else if (typeof data.chiusuraPronostici === "string") {
      const iso = localDateTimeToIso(data.chiusuraPronostici);
      if (iso) {
        data.chiusuraPronostici = iso;
      } else {
        alert("Chiusura Pronostici non valida");
        return;
      }
    }

    try {
      let created;
      try {
        created = await tournamentApi.createTournament(data, apiUrl);
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
