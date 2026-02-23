import { fetchJson, $ } from "/js/utils.js";
import { getEffectiveRoomId } from "/js/ui/utils/roomSelection.js";

function readBootstrap() {
  const el = document.getElementById("bootstrap");
  const raw = el ? el.textContent || "{}" : "{}";
  try {
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function cellText(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "0";
}

function clearTable({ headerRow, bodyEl, totalsRow }) {
  while (headerRow.children.length > 1) headerRow.removeChild(headerRow.lastChild);
  bodyEl.innerHTML = "";
  while (totalsRow.children.length > 1) totalsRow.removeChild(totalsRow.lastChild);
}

function render(data, { headerRow, bodyEl, totalsRow }) {
  clearTable({ headerRow, bodyEl, totalsRow });

  const users = (data && data.users) || [];
  const tournaments = (data && data.tournaments) || [];
  const points = (data && data.points) || {};
  const totals = (data && data.totals) || {};
  const rowMax = (data && data.rowMax) || {};

  users.forEach((u) => {
    const th = document.createElement("th");
    th.className = "user-col";
    th.textContent = (u && u.soprannome) || "";
    headerRow.appendChild(th);

    const tdTot = document.createElement("td");
    tdTot.className = "total-cell";
    tdTot.textContent = cellText(totals[u.uuid]);
    totalsRow.appendChild(tdTot);
  });

  tournaments.forEach((t) => {
    const tr = document.createElement("tr");
    const status = t && t.status ? String(t.status) : "";
    if (status) tr.classList.add(`status-${status}`);

    const th = document.createElement("th");
    th.className = "tournament-col";
    th.textContent = (t && t.name) || "";
    tr.appendChild(th);

    const max = Number(rowMax[String(t.id)]) || 0;
    const rowPoints = points[String(t.id)] || {};

    users.forEach((u) => {
      const td = document.createElement("td");
      const v = Number(rowPoints[u.uuid]) || 0;
      td.textContent = cellText(v);
      if (max > 0 && v === max) td.classList.add("row-max");
      tr.appendChild(td);
    });

    bodyEl.appendChild(tr);
  });
}

async function fetchAnnualRanking(year, apiUrl, roomId) {
  const qs = roomId ? `?room_id=${encodeURIComponent(String(roomId))}` : "";
  const json = await fetchJson(`${apiUrl}/annual-ranking/${encodeURIComponent(String(year))}${qs}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return json && json.data ? json.data : null;
}

async function init() {
  const { apiUrl = "", initialYear = null } = readBootstrap();

  const currentRoomId = getEffectiveRoomId();
  const yearSelect = $("yearSelect");
  const headerRow = $("annualRankingHeader");
  const bodyEl = $("annualRankingBody");
  const totalsRow = $("annualRankingTotals");

  if (!yearSelect || !headerRow || !bodyEl || !totalsRow) return;

  const yNow = new Date().getFullYear();
  const years = [];
  for (let y = yNow; y >= yNow - 6; y--) years.push(y);

  years.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    if (Number(initialYear) === y) opt.selected = true;
    yearSelect.appendChild(opt);
  });

  const load = async () => {
    const y = yearSelect.value;
    try {
      const data = await fetchAnnualRanking(y, apiUrl, currentRoomId);
      render(data, { headerRow, bodyEl, totalsRow });
    } catch (e) {
      console.error("Errore caricamento classifica annuale:", e);
      clearTable({ headerRow, bodyEl, totalsRow });
    }
  };

  yearSelect.addEventListener("change", () => {
    const y = yearSelect.value;
    const url = new URL(window.location.href);
    url.pathname = `/classifica-annuale/${encodeURIComponent(String(y))}`;
    if (currentRoomId) url.searchParams.set("room_id", String(currentRoomId));
    else url.searchParams.delete("room_id");
    window.history.replaceState({}, "", url.toString());
    load();
  });

  await load();
}

init();
