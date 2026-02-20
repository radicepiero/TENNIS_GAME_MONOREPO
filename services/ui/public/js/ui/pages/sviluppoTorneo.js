import { creaColonne } from "/js/ui/components/creaColonne.js";
import { APP_ICONS, phaseLabels } from "/js/icons.js";
import { tournamentApi } from "/js/api/tournamentApi.js";
import { predictionApi } from "/js/api/predictionApi.js";
import { treeApi } from "/js/api/treeApi.js";
import { getEffectiveRoomId } from "/js/ui/utils/roomSelection.js";

function readBootstrap() {
  const el = document.getElementById("bootstrap");
  if (!el) return {};
  try {
    return JSON.parse(el.textContent || "{}");
  } catch (e) {
    return {};
  }
}

function showError(msg) {
  const el = document.getElementById("columns");
  if (!el) return;
  el.innerHTML = `<div style="padding:12px;border:1px solid #f99;background:#fff0f0;color:#900;max-width:720px;margin:12px auto;">${msg}</div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const { tournamentId, tournamentName, apiUrl, loggedUserUuid } = readBootstrap();

  const currentRoomId = getEffectiveRoomId();

  console.log("sviluppoTorneo init", {
    tournamentId,
    tournamentName,
    apiUrl,
  });

  const titleEl = document.getElementById("titolo");
  const titleTextEl = document.getElementById("titolo-text");
  const modalEl = document.getElementById("fase-modal");
  const modalOptionsEl = document.getElementById("fase-modal-options");

  let enabledPhases = new Set([0]);
  let currentPhase = 0;

  const setTitle = (phase) => {
    const p = Number(phase);
    const label = (Array.isArray(phaseLabels) ? phaseLabels[p] : "") || "";
    const name = tournamentName ? String(tournamentName) : "";
    if (titleTextEl) {
      titleTextEl.textContent = `${label.toUpperCase()} ${name} ${APP_ICONS && APP_ICONS.EDIT ? APP_ICONS.EDIT : ""}`.trim();
    }
  };

  const openModal = () => {
    if (!modalEl) return;
    modalEl.classList.add("open");
    modalEl.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    if (!modalEl) return;
    modalEl.classList.remove("open");
    modalEl.setAttribute("aria-hidden", "true");
  };

  const faseToRound = (faseMenu) => {
    const fase = Number(faseMenu);
    if (!Number.isFinite(fase) || fase <= 0) return null;
    return 7 - fase;
  };

  const getPredictedPlayerIds = (predictions) => {
    const ids = new Set();
    for (const p of predictions || []) {
      const rows = (p && p.rows) || [];
      for (const r of rows) {
        if (!r) continue;
        if (typeof r.player_id === "undefined" || r.player_id === null) continue;
        ids.add(Number(r.player_id));
      }
    }
    return ids;
  };

  const matchHasOutcome = (m) => Boolean(m && (m.p1Wins || m.p2Wins));

  const roundPlayedForPredictions = (round, matches, predictedPlayerIds) => {
    const r = Number(round);
    if (!Number.isFinite(r)) return false;

    const relevantMatches = (matches || []).filter((m) => {
      if (!m) return false;
      if (Number(m.round) !== r) return false;
      const p1 = Number(m.player1Id);
      const p2 = Number(m.player2Id);
      return predictedPlayerIds.has(p1) || predictedPlayerIds.has(p2);
    });

    if (relevantMatches.length === 0) return true;

    return relevantMatches.every(matchHasOutcome);
  };

  const computeUnlockedMaxFase = (matches, predictedPlayerIds) => {
    let maxFase = 1;
    for (let fase = 2; fase <= 6; fase++) {
      const prevRound = faseToRound(fase - 1);
      if (prevRound === null) break;
      const ok = roundPlayedForPredictions(prevRound, matches, predictedPlayerIds);
      if (!ok) break;
      maxFase = fase;
    }
    return maxFase;
  };

  const renderModalOptions = () => {
    if (!modalOptionsEl) return;
    const phases = [0, 1, 2, 3, 4, 5, 6];
    modalOptionsEl.innerHTML = "";
    phases.forEach((fase) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "fase-modal__option";
      btn.dataset.fase = String(fase);
      btn.textContent = (Array.isArray(phaseLabels) ? phaseLabels[fase] : "") || String(fase);

      const enabled = enabledPhases.has(Number(fase));
      btn.disabled = !enabled;
      if (Number(fase) === Number(currentPhase)) btn.classList.add("is-active");
      if (!enabled) btn.classList.add("is-disabled");
      btn.addEventListener("click", async () => {
        if (!enabled) return;
        await selectPhase(fase);
        closeModal();
      });

      modalOptionsEl.appendChild(btn);
    });
  };

  const updateMenuVisibility = async () => {
    try {
      const tournament = await tournamentApi.getTournamentBasic(tournamentId, apiUrl);

      const predictions = await predictionApi.getTournamentPredictions(tournamentId, apiUrl, { roomId: currentRoomId });
      const predictedPlayerIds = getPredictedPlayerIds(predictions);

      const treeJson = await treeApi.getSuperuserTreeByTournament(tournamentId, apiUrl);
      const treeId = treeJson && (treeJson.id || treeJson.uuid) ? (treeJson.id || treeJson.uuid) : null;
      if (!treeId) return;

      const matches = await treeApi.getMatchesByTreeId(treeId, apiUrl);

      const unlockedMaxFase = computeUnlockedMaxFase(matches, predictedPlayerIds);
      const roundOpenRaw = tournament && typeof tournament.roundopen !== "undefined" ? tournament.roundopen : null;
      const roundOpen = roundOpenRaw === null || roundOpenRaw === "" ? null : Number(roundOpenRaw);

      const minFaseByRoundOpen = Number.isFinite(roundOpen) ? Math.max(1, Math.min(6, 7 - roundOpen)) : 1;
      const maxFase = unlockedMaxFase;

      const nextEnabled = new Set([0]);
      for (let fase = 1; fase <= 6; fase++) {
        const enabled = fase >= minFaseByRoundOpen && fase <= maxFase;
        if (enabled) nextEnabled.add(fase);
      }
      enabledPhases = nextEnabled;
      renderModalOptions();

      return tournament;
    } catch (e) {
      console.error("updateMenuVisibility failed", e);
      return null;
    }
  };

  const selectPhase = async (fase) => {
    currentPhase = Number(fase);
    setTitle(currentPhase);
    try {
      const columnContainer = document.getElementById("columns");
      if (columnContainer) columnContainer.innerHTML = "";
      await creaColonne(String(tournamentId || ""), String(currentPhase), String(apiUrl || ""), String(loggedUserUuid || ""), currentRoomId);
    } catch (error) {
      console.error("Errore durante lo sviluppo:", error);
      showError("Errore durante il caricamento dati sviluppo");
    }
  };

  if (titleEl) {
    titleEl.addEventListener("click", (e) => {
      const target = e && e.target ? e.target : null;
      if (target && target.closest && target.closest("button")) return;
      renderModalOptions();
      openModal();
    });
    titleEl.addEventListener("keydown", (e) => {
      if (e && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        renderModalOptions();
        openModal();
      }
    });
  }

  if (modalEl) {
    modalEl.addEventListener("click", (e) => {
      const t = e && e.target ? e.target : null;
      if (t && t.dataset && t.dataset.close === "1") {
        closeModal();
      }
    });
  }

  const runInitial = () => {
    const enabled = Array.from(enabledPhases).sort((a, b) => a - b);
    if (!enabled.length) return;
    const lastEnabled = enabled[enabled.length - 1];
    requestAnimationFrame(() => selectPhase(lastEnabled));
  };

  await updateMenuVisibility();

  runInitial();
});
