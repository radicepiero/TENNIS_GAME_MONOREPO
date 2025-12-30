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
  const predCount = Number(t && t._predictionsCount);
  const predCountText = Number.isFinite(predCount) ? String(predCount) : "0";
  const actionsHtml = `
        <a href="/tornei/${safe(t.id)}/edit">Modifica</a>
        <button data-action="delete" data-id="${safe(t.id)}" style="margin-left: 10px;">Elimina</button>
      `;

  return `
    <tr data-id="${safe(t.id)}">
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(t.id)}</td>
      <td style="border-bottom: 1px solid #eee; padding: 8px;">${safe(t.name)}</td>
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
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  return res;
}

async function loadTrees(apiUrl) {
  const res = await apiFetch(`${apiUrl}/trees?includeMatches=false`, { method: "GET" });
  if (!res.ok) return [];
  return await res.json();
}

async function loadPredictionCounts(apiUrl) {
  const res = await apiFetch(`${apiUrl}/predictions/counts/tournaments`, { method: "GET" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json && json.data) || [];
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

  const form = document.getElementById("create-tournament");
  const createStatus = document.getElementById("create-status");

  const createModal = setupCreateModal();

  const filterName = document.getElementById("filter-name");
  const filterYear = document.getElementById("filter-year");
  const reloadBtn = document.getElementById("reload");
  const listStatus = document.getElementById("list-status");

  const tbody = document.querySelector("#tournaments-table tbody");

  let all = [];

  function applyFilters() {
    const nameQ = (filterName.value || "").toLowerCase();
    const yearQ = filterYear.value || "";

    const filtered = all.filter((t) => {
      const okName = !nameQ || String(t.name || "").toLowerCase().includes(nameQ);
      const y = toYear(t.datafine || t.datainizio);
      const okYear = !yearQ || y === yearQ;
      return okName && okYear;
    });

    tbody.innerHTML = filtered.map(rowHtml).join("");
  }

  async function load() {
    setText(listStatus, "Caricamento...");
    try {
      const res = await apiFetch(`${apiUrl}/tournaments`, { method: "GET" });
      if (!res.ok) {
        setText(listStatus, `Errore: ${res.status}`);
        return;
      }
      all = await res.json();

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

  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action='delete']");
    if (!btn) return;

    const id = btn.dataset.id;
    if (!id) return;

    const ok = confirm(`Eliminare torneo ${id}?`);
    if (!ok) return;

    setText(listStatus, "Eliminazione...");
    try {
      const res = await apiFetch(`${apiUrl}/tournaments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setText(listStatus, `Errore delete: ${res.status}`);
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

    try {
      const res = await apiFetch(`${apiUrl}/tournaments`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        setText(createStatus, `Errore: ${res.status}`);
        return;
      }

      const created = await res.json();
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
