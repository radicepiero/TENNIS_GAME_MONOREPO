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

function enableHorizontalScrollDebug({ tournamentLabel, fromRoundSelect, toRoundSelect }) {
  const scroller = document.getElementById("tree-simple");
  if (!(scroller instanceof HTMLElement)) return;
  if (scroller.dataset && scroller.dataset.scrollDebugBound === "1") return;
  if (scroller.dataset) scroller.dataset.scrollDebugBound = "1";

  let rafPending = false;
  let lastLoggedLeft = null;
  let lastRound = null;
  let interruptInProgress = false;
  let lastScrollLeft = null;
  let lastIntent = null; // "forward" | "backward"
  let leftBoundarySince = null;
  let lastBackwardTriggerAt = 0;

  const getRoundLabel = (round) => {
    const i = Number(round);
    if (!Number.isFinite(i) || i <= 0) return "";
    const label = roundLabels && roundLabels.length ? roundLabels[roundLabels.length - i] : null;
    return label || `Round ${i}`;
  };

  const getFromTo = () => {
    const fromRound = Number(fromRoundSelect && fromRoundSelect.value);
    const toRound = Number(toRoundSelect && toRoundSelect.value);
    return {
      fromRound: Number.isFinite(fromRound) ? fromRound : null,
      toRound: Number.isFinite(toRound) ? toRound : null,
    };
  };

  const getRoundFromNodeEl = (el) => {
    if (!el) return null;
    const node = el.closest ? el.closest(".treant-node") : null;
    if (!node || !node.classList) return null;
    for (const c of node.classList) {
      if (typeof c === "string" && c.startsWith("round-")) {
        const n = Number(c.slice("round-".length));
        return Number.isFinite(n) ? n : null;
      }
    }
    return null;
  };

  const computeCurrentRound = () => {
    const { fromRound, toRound } = getFromTo();
    if (!fromRound || !toRound) return null;

    // Metodo robusto: leggi il round del nodo effettivamente sotto il bordo sinistro del viewport dello scroller.
    // Questo cambia fase quando i contenitori escono/entrano dallo schermo.
    const viewport = scroller.getBoundingClientRect();
    const x = viewport.left + 6;
    const y = viewport.top + Math.max(1, Math.min(viewport.height - 2, viewport.height * 0.5));
    const elAtPoint = document.elementFromPoint(x, y);
    const roundAtPoint = getRoundFromNodeEl(elAtPoint);
    if (roundAtPoint !== null) {
      return Math.min(fromRound, Math.max(toRound, roundAtPoint));
    }

    // La fase cambia quando i contenitori (nodi) del round precedente sono COMPLETAMENTE fuori dal viewport.
    // Guardiamo le bbox dei `.treant-node.round-X` rispetto al viewport dello scroller.
    const margin = 8; // px: piccola tolleranza per evitare flicker

    for (let r = fromRound; r >= toRound; r--) {
      const nodes = scroller.querySelectorAll(`.treant-node.round-${r}`);
      if (!nodes || nodes.length === 0) continue;

      let maxRight = -Infinity;
      for (const n of nodes) {
        const rect = n.getBoundingClientRect();
        if (rect.right > maxRight) maxRight = rect.right;
      }

      // Se il bordo destro più a destra del round è ancora nel viewport (o lo supera),
      // allora questa fase non è ancora "uscita".
      if (maxRight > viewport.left + margin) return r;
    }

    return toRound;
  };

  const triggerInterruptRerender = (currentRound, direction) => {
    if (interruptInProgress) return;
    if (!currentRound) return;

    const maxFrom = (() => {
      const n = Number(fromRoundSelect && fromRoundSelect.value);
      return Number.isFinite(n) ? n : Number(currentRound);
    })();

    const forwardFrom = Number(currentRound);
    const forwardTo = Math.max(1, forwardFrom - 2);

    const backwardFrom = Math.min(maxFrom, Number(currentRound) + 1);
    const backwardTo = Math.max(1, Number(currentRound) - 2);

    const isBackward = direction === "backward";
    const from = isBackward ? backwardFrom : forwardFrom;
    const to = isBackward ? backwardTo : forwardTo;

    interruptInProgress = true;
    scroller.style.pointerEvents = "none";

    // Rerender con la fase corrente + peek della successiva.
    // Reset scrollLeft a 0 dopo il render per evitare che la fase corrente risulti già "uscita".
    try {
      renderTree(from, to);
    } finally {
      requestAnimationFrame(() => {
        if (isBackward) {
          const viewport = scroller.getBoundingClientRect();
          const nodes = scroller.querySelectorAll(`.treant-node.round-${Number(currentRound)}`);
          let minLeft = Infinity;
          for (const n of nodes) {
            const r = n.getBoundingClientRect();
            if (r.left < minLeft) minLeft = r.left;
          }

          if (Number.isFinite(minLeft)) {
            const contentX = minLeft - viewport.left + scroller.scrollLeft;
            const peek = 24;
            scroller.scrollLeft = Math.max(0, contentX - peek);
          }
        } else {
          scroller.scrollLeft = 0;
        }
        lastRound = currentRound;
        lastScrollLeft = scroller.scrollLeft;
        scroller.style.pointerEvents = "";
        interruptInProgress = false;
      });
    }
  };

  const triggerBackwardAtLeftBoundary = () => {
    const { fromRound, toRound } = getFromTo();
    if (!fromRound || !toRound) return;
    const base = Number(lastRound) || Number(computeCurrentRound()) || toRound;
    const target = Math.min(fromRound, base + 1);
    if (target <= base) return;

    // Per il ritorno serve includere davvero fasi a sinistra.
    // Renderizziamo una finestra più ampia verso sinistra, poi riallineiamo su `target`.
    interruptInProgress = true;
    scroller.style.pointerEvents = "none";

    const from = Math.min(fromRound, target + 2);
    const to = Math.max(1, target - 2);

    try {
      renderTree(from, to);
    } finally {
      requestAnimationFrame(() => {
        const viewport = scroller.getBoundingClientRect();
        const nodes = scroller.querySelectorAll(`.treant-node.round-${Number(target)}`);
        let minLeft = Infinity;
        for (const n of nodes) {
          const r = n.getBoundingClientRect();
          if (r.left < minLeft) minLeft = r.left;
        }
        if (Number.isFinite(minLeft)) {
          const contentX = minLeft - viewport.left + scroller.scrollLeft;
          const peek = 24;
          scroller.scrollLeft = Math.max(0, contentX - peek);
        }

        lastRound = target;
        lastScrollLeft = scroller.scrollLeft;
        lastIntent = null;
        lastBackwardTriggerAt = Date.now();
        scroller.style.pointerEvents = "";
        interruptInProgress = false;
      });
    }
  };

  const update = () => {
    rafPending = false;
    const left = scroller.scrollLeft;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);

    const currentRound = computeCurrentRound();
    const fase = currentRound ? getRoundLabel(currentRound) : "";

    const nomeTorneo = $("nome-torneo");
    if (nomeTorneo) {
      const parts = [tournamentLabel];
      if (fase) parts.push(fase);
      nomeTorneo.textContent = parts.join(" · ");
    }

    // interrupt: quando la fase corrente cambia perché quella precedente è uscita dal viewport.
    // Questo è il trigger che useremo poi per lo snap per fase.
    if (
      !interruptInProgress &&
      lastRound !== null &&
      currentRound !== null &&
      Number.isFinite(Number(lastRound)) &&
      Number.isFinite(Number(currentRound))
    ) {
      if (Number(currentRound) < Number(lastRound)) triggerInterruptRerender(currentRound, "forward");
      else if (Number(currentRound) > Number(lastRound)) triggerInterruptRerender(currentRound, "backward");
    }

    // Se siamo al boundary sinistro e l'utente tenta di andare ancora "a sinistra",
    // currentRound non può aumentare perché quei round non sono renderizzati: trigger manuale.
    if (!interruptInProgress && left === 0 && (lastScrollLeft === 0 || lastScrollLeft === null) && lastIntent === "backward") {
      triggerBackwardAtLeftBoundary();
    }

    // tracking stabilità sul boundary sinistro
    if (left === 0) {
      if (leftBoundarySince === null) leftBoundarySince = Date.now();
    } else {
      leftBoundarySince = null;
    }

    lastScrollLeft = left;
    lastRound = currentRound;
  };

  scroller.addEventListener(
    "scroll",
    () => {
      if (rafPending) return;
      rafPending = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );

  scroller.addEventListener(
    "wheel",
    (e) => {
      if (typeof e.deltaX === "number") {
        if (e.deltaX < 0) lastIntent = "backward";
        else if (e.deltaX > 0) lastIntent = "forward";
      }
    },
    { passive: true }
  );

  let touchStartX = null;
  let touchStartY = null;
  let touchLastDX = 0;
  let touchLastDY = 0;
  scroller.addEventListener(
    "touchstart",
    (e) => {
      const t = e && e.touches && e.touches[0];
      touchStartX = t ? t.clientX : null;
      touchStartY = t ? t.clientY : null;
      touchLastDX = 0;
      touchLastDY = 0;
    },
    { passive: true }
  );
  scroller.addEventListener(
    "touchmove",
    (e) => {
      const t = e && e.touches && e.touches[0];
      if (!t || touchStartX === null || touchStartY === null) return;
      touchLastDX = t.clientX - touchStartX;
      touchLastDY = t.clientY - touchStartY;
    },
    { passive: true }
  );

  scroller.addEventListener(
    "touchend",
    () => {
      if (interruptInProgress) return;

      // Se siamo al boundary sinistro e l'utente tenta di "tirare" verso sinistra (swipe right),
      // inneschiamo il rerender backward anche se lo scroll non si muove.
      const dx = touchLastDX;
      const dy = touchLastDY;
      const threshold = 40;
      const ratioOk = Math.abs(dx) > Math.abs(dy) * 1.3;
      const cooldownOk = Date.now() - (lastBackwardTriggerAt || 0) >= 700;
      const stableOk = leftBoundarySince !== null && Date.now() - leftBoundarySince >= 120;

      if (scroller.scrollLeft === 0 && dx > threshold && ratioOk && cooldownOk && stableOk) {
        lastIntent = "backward";
        triggerBackwardAtLeftBoundary();
      }

      touchStartX = null;
      touchStartY = null;
      touchLastDX = 0;
      touchLastDY = 0;
    },
    { passive: true }
  );

  // log iniziale
  requestAnimationFrame(update);
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
      enableHorizontalScrollDebug({ tournamentLabel, fromRoundSelect, toRoundSelect });
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
