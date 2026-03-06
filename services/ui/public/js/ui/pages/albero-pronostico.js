import { $ } from "/js/utils.js";
import { Tournament } from "/js/domain/Tournament.js";
import { APP_ICONS, roundLabels } from "/js/icons.js";
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

  if (saveBtn) saveBtn.textContent = APP_ICONS.SAVE;
  if (deleteBtn) deleteBtn.textContent = APP_ICONS.DELETE;

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
  const tournamentLabel = (tournament && (tournament.nickname || tournament.name)) || "";
  document.title = `pronostico ${tournamentLabel}`;
  const nomeTorneo = $("nome-torneo");
  if (nomeTorneo) nomeTorneo.textContent = tournamentLabel;

  populateRoundSelects(tournament, roundLabels.slice(1));

  const fromRoundSelect = $("fromRound");
  const toRoundSelect = $("toRound");
  const effectiveRounds = (() => {
    const n = Number(tournament && tournament.roundopen);
    return Number.isFinite(n) && n > 0 ? n : 6;
  })();

  if (fromRoundSelect) fromRoundSelect.value = String(effectiveRounds);
  if (toRoundSelect) toRoundSelect.value = "1";

  const roundNav = document.getElementById("round-nav");
  const roundPrevBtn = document.getElementById("round-prev");
  const roundNextBtn = document.getElementById("round-next");

  const getRoundLabelByNumber = (roundNumber) => {
    const n = Number(roundNumber);
    if (!Number.isFinite(n) || n < 1) return "";
    const idx = roundLabels.slice(1).length - n;
    const lbl = roundLabels.slice(1)[idx];
    return lbl || `Round ${n}`;
  };

  const setTitleWithPhase = (fromRound) => {
    if (!nomeTorneo) return;
    const phase = getRoundLabelByNumber(fromRound);
    nomeTorneo.textContent = phase ? `${tournamentLabel} - ${phase}` : tournamentLabel;
  };

  const setNavArrows = ({ fromRound }) => {
    if (!roundNav || !roundPrevBtn || !roundNextBtn) return;
    // Show arrows always; CSS decides when visible.
    roundNav.setAttribute("aria-hidden", "false");
    roundPrevBtn.textContent = APP_ICONS.ARROW_LEFT;
    roundNextBtn.textContent = APP_ICONS.ARROW_RIGHT;
    const n = Number(fromRound);
    roundPrevBtn.disabled = !Number.isFinite(n) || n >= effectiveRounds;
    roundNextBtn.disabled = !Number.isFinite(n) || n <= 1;
  };

  const filterBar = $("filter-bar");
  if (filterBar) {
    filterBar.classList.remove("hidden");
    filterBar.classList.add("visible");
  }

  const onChange = () => renderFromDropdowns({ fromRoundSelect, toRoundSelect, effectiveRounds });
  if (fromRoundSelect) fromRoundSelect.addEventListener("change", onChange);
  if (toRoundSelect) toRoundSelect.addEventListener("change", onChange);

  const renderCurrent = () => {
    const fromRound = Number(fromRoundSelect && fromRoundSelect.value);
    const toRound = Number(toRoundSelect && toRoundSelect.value);
    setTitleWithPhase(fromRound);
    setNavArrows({ fromRound });
    renderFromDropdowns({ fromRoundSelect, toRoundSelect, effectiveRounds });
  };

  if (roundPrevBtn) {
    roundPrevBtn.addEventListener("click", () => {
      const cur = Number(fromRoundSelect && fromRoundSelect.value);
      const next = Math.min(effectiveRounds, (Number.isFinite(cur) ? cur : effectiveRounds) + 1);
      if (fromRoundSelect) fromRoundSelect.value = String(next);
      if (toRoundSelect) toRoundSelect.value = String(next);
      renderCurrent();
    });
  }
  if (roundNextBtn) {
    roundNextBtn.addEventListener("click", () => {
      const cur = Number(fromRoundSelect && fromRoundSelect.value);
      const next = Math.max(1, (Number.isFinite(cur) ? cur : effectiveRounds) - 1);
      if (fromRoundSelect) fromRoundSelect.value = String(next);
      if (toRoundSelect) toRoundSelect.value = String(next);
      renderCurrent();
    });
  }

  await setup(tournament, user, apiUrl);

  async function ensureTreeOrOfferClone() {
    const alberi = await getAlberi(tournament);
    const mine = (alberi || []).find((t) => t && user && t.ownerId === user.uuid) || null;

    if (mine) {
      setEditable(false);
      setWinnersEditable(true);
      await getAlberoMatches(mine.id);
      renderCurrent();
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
