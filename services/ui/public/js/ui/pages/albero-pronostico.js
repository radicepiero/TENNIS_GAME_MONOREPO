import { $ } from "/js/utils.js";
import { Tournament } from "/js/domain/Tournament.js";
import { APP_ICONS, roundLabels } from "/js/icons.js";
import { enableFloatingToolbar } from "/js/ui/components/floatingToolbar.js";
import { treeApi } from "/js/api/treeApi.js";
import { predictionApi } from "/js/api/predictionApi.js";
import { getEffectiveRoomId } from "/js/ui/utils/roomSelection.js";
import {
  setup,
  renderTree,
  getAlberi,
  getAlberoMatches,
  saveAlbero,
  deleteAlbero,
  getCurrentTree,
  populateRoundSelects,
  setEditable,
  setWinnersEditable,
  onTreeChanged,
} from "/js/ui/components/alberoTorneo.js";

function isMatchWon(match) {
  return Boolean(match && ((match.p1Wins && !match.p2Wins) || (!match.p1Wins && match.p2Wins)));
}

function getWinnerPlayerId(match) {
  if (!match) return 0;
  if (match.p1Wins && !match.p2Wins) return Number(match.player1) || 0;
  if (match.p2Wins && !match.p1Wins) return Number(match.player2) || 0;
  return 0;
}

function computePredictionFromTree(tree) {
  const matches = (tree && tree.matches) || [];
  const finalMatch = matches.find((m) => Number(m.round) === 1) || null;
  const semiMatches = matches.filter((m) => Number(m.round) === 2);

  const finalReady =
    finalMatch &&
    isMatchWon(finalMatch) &&
    (Number(finalMatch.player1) || 0) > 0 &&
    (Number(finalMatch.player2) || 0) > 0;
  const semisReady =
    semiMatches.length === 2 &&
    semiMatches.every(
      (m) => isMatchWon(m) && (Number(m.player1) || 0) > 0 && (Number(m.player2) || 0) > 0
    );

  if (!finalReady || !semisReady) {
    return { ready: false, rows: [] };
  }

  const winnerId = getWinnerPlayerId(finalMatch);
  const semifinalistIds = new Set();
  for (const m of semiMatches) {
    semifinalistIds.add(Number(m.player1) || 0);
    semifinalistIds.add(Number(m.player2) || 0);
  }
  semifinalistIds.delete(0);

  const rows = [];
  for (const pid of semifinalistIds) {
    if (pid === winnerId) continue;
    rows.push({ player_id: pid, prediction: "semifinalist" });
  }
  if (winnerId) rows.push({ player_id: winnerId, prediction: "winner" });

  return { ready: rows.length >= 2 && Boolean(winnerId), rows };
}

function renderFromDropdowns({ fromRoundSelect, toRoundSelect, effectiveRounds }) {
  const fromRound = Number(fromRoundSelect && fromRoundSelect.value);
  const toRound = Number(toRoundSelect && toRoundSelect.value);
  if (!Number.isFinite(fromRound) || !Number.isFinite(toRound)) return;

  if (toRound > fromRound && toRoundSelect) {
    toRoundSelect.value = String(fromRound);
    renderTree(fromRound, fromRound);
    return;
  }

  renderTree(fromRound, toRound);
}

async function init() {
  const bootstrap = document.getElementById("page-bootstrap");
  const apiUrl = bootstrap?.dataset?.apiUrl || "";
  const tournamentId = bootstrap?.dataset?.tournamentId || "";
  const user = bootstrap?.dataset?.user ? JSON.parse(bootstrap.dataset.user) : null;

  const saveBtn = $("saveButton");
  const deleteBtn = $("deleteButton");
  const generatePredictionBtn = $("generatePredictionButton");
  const warn = $("warning");
  const toolbarHandle = $("floating-toolbar-handle");
  if (toolbarHandle) toolbarHandle.textContent = `${APP_ICONS.MOVE} Azioni`;

  const toolbarToggleBtn = $("floating-toolbar-toggle");

  if (saveBtn) saveBtn.textContent = APP_ICONS.SAVE;
  if (deleteBtn) deleteBtn.textContent = APP_ICONS.DELETE;

  enableFloatingToolbar({ toolbarId: "floating-toolbar", storageKey: `floatingToolbar:albero-pronostico:${tournamentId}` });

  const toolbarEl = document.getElementById("floating-toolbar");
  const collapsedKey = `floatingToolbar:collapsed:albero-pronostico:${tournamentId}`;
  const setToggleLabel = () => {
    if (!toolbarToggleBtn || !toolbarEl) return;
    const isCollapsed = toolbarEl.classList.contains("collapsed");
    toolbarToggleBtn.textContent = isCollapsed ? APP_ICONS.EXPAND : APP_ICONS.COLLAPSE;
    const label = isCollapsed ? "Mostra di più" : "Mostra di meno";
    toolbarToggleBtn.title = label;
    toolbarToggleBtn.setAttribute("aria-label", label);
  };
  const setCollapsed = (next) => {
    if (!toolbarEl) return;
    const v = Boolean(next);
    if (v) toolbarEl.classList.add("collapsed");
    else toolbarEl.classList.remove("collapsed");
    setToggleLabel();
    try {
      window.localStorage && window.localStorage.setItem(collapsedKey, v ? "1" : "0");
    } catch (_) {}
  };
  const loadCollapsed = () => {
    try {
      const raw = window.localStorage ? window.localStorage.getItem(collapsedKey) : null;
      return raw === "1";
    } catch (_) {
      return false;
    }
  };
  setCollapsed(loadCollapsed());

  if (toolbarToggleBtn) {
    toolbarToggleBtn.type = "button";
    toolbarToggleBtn.addEventListener("click", () => {
      if (!toolbarEl) return;
      setCollapsed(!toolbarEl.classList.contains("collapsed"));
    });
    setToggleLabel();
  }

  if (toolbarHandle) {
    toolbarHandle.title = "Doppio click per aprire/chiudere";
    toolbarHandle.addEventListener("dblclick", () => {
      if (!toolbarEl) return;
      setCollapsed(!toolbarEl.classList.contains("collapsed"));
    });
  }

  let dirty = false;
  function setDirty(next) {
    dirty = Boolean(next);
    if (!saveBtn) return;
    if (dirty) saveBtn.classList.remove("hidden");
    else saveBtn.classList.add("hidden");
  }

  function showWarning(msg) {
    if (!warn) return;
    warn.textContent = msg;
    warn.classList.remove("hidden");
  }

  function updateGeneratePredictionVisibility() {
    if (!generatePredictionBtn) return;
    const tree = getCurrentTree();
    const pred = computePredictionFromTree(tree);
    if (pred.ready) generatePredictionBtn.classList.remove("hidden");
    else generatePredictionBtn.classList.add("hidden");
  }

  onTreeChanged(() => {
    setDirty(true);
    updateGeneratePredictionVisibility();
  });

  const tournament = (await Tournament.fetchTournament(tournamentId, apiUrl)).data[0];
  document.title = `pronostico ${tournament.name}`;
  const nomeTorneo = $("nome-torneo");
  if (nomeTorneo) nomeTorneo.textContent = tournament.name;

  populateRoundSelects(tournament, roundLabels.slice(1));

  const fromRoundSelect = $("fromRound");
  const toRoundSelect = $("toRound");
  const effectiveRounds = (() => {
    const n = Number(tournament && tournament.roundopen);
    return Number.isFinite(n) && n > 0 ? n : 6;
  })();

  if (fromRoundSelect) fromRoundSelect.value = String(effectiveRounds);
  if (toRoundSelect) toRoundSelect.value = "1";

  const filterBar = $("filter-bar");
  if (filterBar) {
    filterBar.classList.remove("hidden");
    filterBar.classList.add("visible");
  }

  const onChange = () => renderFromDropdowns({ fromRoundSelect, toRoundSelect, effectiveRounds });
  if (fromRoundSelect) fromRoundSelect.addEventListener("change", onChange);
  if (toRoundSelect) toRoundSelect.addEventListener("change", onChange);

  await setup(tournament, user, apiUrl);

  async function ensureTreeOrOfferClone() {
    const alberi = await getAlberi(tournament);
    const mine = (alberi || []).find((t) => t && user && t.ownerId === user.uuid) || null;

    if (mine) {
      setEditable(false);
      setWinnersEditable(true);
      await getAlberoMatches(mine.id);
      renderTree(
        Number(fromRoundSelect && fromRoundSelect.value ? fromRoundSelect.value : effectiveRounds),
        Number(toRoundSelect && toRoundSelect.value ? toRoundSelect.value : 1)
      );
      setDirty(false);
      if (deleteBtn) deleteBtn.classList.remove("hidden");
      updateGeneratePredictionVisibility();
      return;
    }

    const skipKey = `skipAutoClone:${String(tournamentId)}`;
    if (window.sessionStorage && window.sessionStorage.getItem(skipKey) === "1") {
      window.sessionStorage.removeItem(skipKey);
      showWarning("Albero eliminato.");
      return;
    }

    const status = tournament && tournament.status ? String(tournament.status) : "";
    if (status !== "open") {
      showWarning("Puoi copiare/compilare l'albero solo quando il torneo è in stato OPEN.");
      return;
    }

    try {
      await treeApi.getSuperuserTreeByTournament(tournamentId, apiUrl, false);
    } catch (e) {
      showWarning("Albero superuser non disponibile per questo torneo.");
      return;
    }

    try {
      await treeApi.cloneSuperuserTreeByTournament(tournamentId, apiUrl);
      location.reload();
    } catch (e) {
      if (String((e && e.message) || "").includes("409")) {
        location.reload();
        return;
      }
      showWarning((e && e.message) || "Errore clonazione albero");
      return;
    }
  }

  if (generatePredictionBtn) {
    generatePredictionBtn.addEventListener("click", async () => {
      try {
        const roomId = getEffectiveRoomId();
        const tree = getCurrentTree();
        const pred = computePredictionFromTree(tree);
        if (!pred.ready) {
          showWarning("Completa prima semifinali e finale (seleziona vincenti) per generare il pronostico.");
          return;
        }

        const alreadyExists = await predictionApi.userPredictionExistsByTournament(tournamentId, apiUrl, { roomId });
        if (alreadyExists) {
          const ok = confirm(
            "Esiste già un pronostico per questo torneo. Continuando il nuovo pronostico sostituirà il precedente. Vuoi continuare?"
          );
          if (!ok) return;
        }

        generatePredictionBtn.disabled = true;
        await predictionApi.createPrediction({ tournament_id: tournamentId, rows: pred.rows }, apiUrl, { roomId });
        const qs = roomId ? `?room_id=${encodeURIComponent(String(roomId))}` : "";
        location.href = `/tornei/${encodeURIComponent(tournamentId)}/pronostico${qs}`;
      } catch (e) {
        generatePredictionBtn.disabled = false;
        showWarning((e && e.message) || "Errore generazione pronostico");
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        if (!dirty) return;
        await saveAlbero(apiUrl);
        setDirty(false);
      } catch (e) {
        showWarning((e && e.message) || "Errore salvataggio");
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      try {
        const ok = confirm("Confermi eliminazione albero?");
        if (!ok) return;
        deleteBtn.disabled = true;
        await deleteAlbero(apiUrl);
        const skipKey = `skipAutoClone:${String(tournamentId)}`;
        if (window.sessionStorage) {
          window.sessionStorage.setItem(skipKey, "1");
        }
        location.href = "/tornei/friends";
      } catch (e) {
        deleteBtn.disabled = false;
        showWarning((e && e.message) || "Errore eliminazione");
      }
    });
  }

  ensureTreeOrOfferClone();
}

init();
