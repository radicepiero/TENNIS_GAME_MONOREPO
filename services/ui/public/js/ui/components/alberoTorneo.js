// /js/alberoTorneo.js
import { Tree } from "/js/domain/Tree.js";
import Player from "/js/domain/Player.js";
import { PennaDialogo } from "/js/ui/components/pennaDialogo.js";
import { toTreantNodeStructure } from "/js/ui/components/TreeTreantAdapter.js";
import { treeApiClient } from "/js/ui/components/TreeApiClient.js";
import { treeApi } from "/js/api/treeApi.js";
import { buildPlayerInfoElement } from "/js/ui/components/playerCard.js";
import { APP_BUTTONS, APP_ICONS } from "/js/icons.js";
let players = {};
let albero = null;
let dialog = {};
let tournament = {};
let user = {};
let apiUrl = "";
let editable = true;
let winnersEditable = true;

const treeChangeListeners = [];

export function onTreeChanged(listener) {
  if (typeof listener !== "function") return;
  treeChangeListeners.push(listener);
}

function notifyTreeChanged() {
  for (const fn of treeChangeListeners) {
    try {
      fn();
    } catch (e) {
      console.error("Errore listener onTreeChanged:", e);
    }
  }
}

let lastScrollSnapshot = null;

function getEffectiveTournamentRounds(t) {
  const v = t && (t.roundopen ?? t.roundOpen ?? t.round_open);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 6;
}

function getScrollableAncestor(startEl) {
  let el = startEl;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const canScrollY =
        (overflowY === "auto" || overflowY === "scroll") &&
        el.scrollHeight > el.clientHeight;
      const canScrollX =
        (overflowX === "auto" || overflowX === "scroll") &&
        el.scrollWidth > el.clientWidth;
      if (canScrollY || canScrollX) return el;
    }
    el = el.parentElement;
  }
  return document.getElementById("scroll-container");
}

function captureScrollSnapshot(sourceEl = null) {
  const scroller = getScrollableAncestor(sourceEl);
  const scrollerId = scroller && scroller.id ? scroller.id : "scroll-container";
  lastScrollSnapshot = {
    scrollerId,
    containerTop: scroller ? scroller.scrollTop : 0,
    containerLeft: scroller ? scroller.scrollLeft : 0,
    windowX: window.scrollX,
    windowY: window.scrollY,
  };
}

export async function setup(torneo, utente, _apiUrl) {
  tournament = torneo;
  user = utente;
  apiUrl = _apiUrl;
  players = await Player.fetchByTournament(tournament, apiUrl);
  const giocatoreNull = new Player({
    id: 0,
    name: APP_BUTTONS.PLAYER_TBD,
  });
  players.push(giocatoreNull);

  // La modale (PennaDialogo) serve anche quando si modifica un albero esistente.
  // In precedenza veniva inizializzata solo in genera(), quindi il click sui giocatori
  // non apriva nulla sugli alberi già creati.
  dialog = new PennaDialogo("#dialogContainer", { options: players });
}

export function setEditable(isEditable) {
  editable = Boolean(isEditable);
}

export function setWinnersEditable(isEditable) {
  winnersEditable = Boolean(isEditable);
}

export function genera() {
  if (tournament && String(tournament.status).toLowerCase() === "excluded") {
    alert("Torneo escluso: non è possibile generare l'albero.");
    return;
  }
  const effectiveRounds = getEffectiveTournamentRounds(tournament);
  editable = true;
  albero = Tree.generate({
    name: `${new Date()} ${user.soprannome || user.email}`,
    tournament: tournament,
    ownerId: user.uuid,
    numPlayers: 2 ** effectiveRounds,
  });
  dialog = new PennaDialogo("#dialogContainer", { options: players });
  renderTree(effectiveRounds, 1);
}

export async function getAlberoMatches(treeId) {
  albero = await treeApiClient.fetchAndImportTree(treeId, apiUrl);
  return albero;
}
//la funzione chiede genericamente gli alberi all'api, sarà lei a selezionare quali alberi saranno messi a disposizione.
export async function getAlberi(tournament) {
  return await treeApi.getTrees({ tournamentId: tournament.id, includeMatches: false }, apiUrl);
}

export async function deleteAlbero() {
  //console.log("albero.id", albero.uuid);
  return await treeApi.deleteTree(albero.uuid, apiUrl);
}

export function getCurrentTree() {
  return albero;
}

export async function saveAlbero() {
  try {
    const result = await treeApiClient.saveTree(albero, apiUrl);
    return result; // puoi gestire qui il risultato
  } catch (error) {
    console.error("Errore durante il salvataggio dell'albero:", error.message);
    throw error;
  }
}

export async function saveNewAlbero() {
  try {
    const result = await treeApiClient.createTree(albero, apiUrl);
    return result; // puoi gestire qui il risultato
  } catch (error) {
    console.error("Errore durante la creazione dell'albero:", error.message);
  }
}

export function setupPlayerElement(player) {
  const newElement = buildPlayerInfoElement(player, {
    nameFormat: "initials",
    showCountryCode: false,
  });
  newElement.addEventListener("click", handlePlayerClick);
  return newElement;
}

function handlePlayerClick(event) {
  event.stopPropagation();
  if (!editable) return;
  captureScrollSnapshot(event.target);
  // Verifica il round PRIMA di aprire il dialog
  const clickedRound = getRoundTreantNode(
    event.currentTarget.parentElement.parentElement.parentElement
  );
  const effectiveRounds = getEffectiveTournamentRounds(tournament);
  console.log("clickedRound", clickedRound);
  console.log("tournament.roundopen", tournament && tournament.roundopen);
  console.log("effectiveRounds", effectiveRounds);
  if (clickedRound !== effectiveRounds) {
    return; // Esci subito se non è il round giusto
  }

  const getPlayerIdFromEl = (el) => {
    if (!el) return 0;
    const raw = el.dataset && typeof el.dataset.playerid !== "undefined" ? el.dataset.playerid : el.id;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  const clearPlayerFromFutureRounds = (playerId, treantNodeId) => {
    if (!playerId) return;
    const startMatch = albero.matches.find((el) => el.uuid === treantNodeId);
    if (!startMatch) return;
    let parentId = startMatch.fatherId;
    while (parentId) {
      const parent = albero.matches.find((el) => el.uuid === parentId);
      if (!parent) break;
      if (parent.player1 === playerId) parent.player1 = 0;
      if (parent.player2 === playerId) parent.player2 = 0;
      parent.p1Wins = false;
      parent.p2Wins = false;
      parentId = parent.fatherId;
    }
  };

  dialog.open({
    operazione: ((clickedElement) => {
      return function (selectedPlayer) {
        if (
          getRoundTreantNode(
            clickedElement.parentElement.parentElement.parentElement
          ) !== getEffectiveTournamentRounds(tournament)
        )
          return;
        const container = clickedElement.parentElement;
        const oldPlayerId = getPlayerIdFromEl(clickedElement);
        const newElement = setupPlayerElement(selectedPlayer);
        container.replaceChild(newElement, clickedElement);
        const matchInCorso = albero.matches.find(
          (el) => el.uuid === container.parentElement.parentElement.id
        );
        if (!matchInCorso) return;
        const newPlayerId = getPlayerIdFromEl(newElement);
        if (parseInt(container.dataset.posizione) === 1) {
          matchInCorso.player1 = newPlayerId;
        }
        if (parseInt(container.dataset.posizione) === 2) {
          matchInCorso.player2 = newPlayerId;
        }

        matchInCorso.p1Wins = false;
        matchInCorso.p2Wins = false;
        if (oldPlayerId !== newPlayerId) {
          clearPlayerFromFutureRounds(oldPlayerId, matchInCorso.uuid);
        }

        const fromRoundSelect = document.getElementById("fromRound").value;
        const toRoundSelect = document.getElementById("toRound").value;
        renderTree(fromRoundSelect, toRoundSelect);
      };
    })(event.currentTarget),
  });
}

export function creaComodino(onClick = () => {}) {
  const comodino = document.createElement("span");
  comodino.className = "toggle-winner";
  comodino.textContent = APP_ICONS.LOOSER;
  if (!winnersEditable) {
    comodino.style.display = "none";
  } else {
    comodino.addEventListener("click", onClick);
  }
  return comodino;
}

export function creaPostoLetto(giocatore, comodino) {
  const divGiocatore = setupPlayerElement(giocatore);
  const postoLetto = document.createElement("div");
  postoLetto.className = "posto-letto";
  postoLetto.append(divGiocatore, comodino);
  return postoLetto;
}

export function costruisciLetto(giocatore1, giocatore2) {
  const letto = document.createElement("div");
  letto.className = "players";

  const comodino1 = creaComodino();
  const comodino2 = creaComodino();
  const handler = aggiornaVincitore(comodino1, comodino2);
  comodino1.addEventListener("click", handler);
  comodino2.addEventListener("click", handler);

  const postoLetto1 = creaPostoLetto(giocatore1, comodino1);
  postoLetto1.dataset.posizione = 1;
  const postoLetto2 = creaPostoLetto(giocatore2, comodino2);
  postoLetto2.dataset.posizione = 2;
  letto.append(postoLetto1, postoLetto2);

  return letto;
}

function setGiocatoreVincente(vincente, perdente) {
  vincente.textContent = APP_ICONS.WINNER;
  perdente.textContent = APP_ICONS.LOOSER;
  vincente.parentElement.classList.add("winner");
  vincente.parentElement.classList.remove("looser");
  perdente.parentElement.classList.add("looser");
  perdente.parentElement.classList.remove("winner");
}

function getRoundTreantNode(treantNode) {
  const classList = treantNode.className.split(" ");
  const roundClass = classList.find((c) => c.startsWith("round-"));
  return roundClass ? parseInt(roundClass.split("-")[1]) : null;
}

function destinazioneVincitore(destinationNodeId, startingNodeId) {
  const father = albero.matches.find((el) => el.uuid === destinationNodeId);
  return father?.children[0]?.uuid === startingNodeId ? 1 : 2;
}

function cancellaPerdenteDaiTurniSuccessivi(looser, treantNodeId) {
  const match = albero.matches.find((el) => el.uuid === treantNodeId);
  const matchPadre = match.fatherId;
  let matchAvo = albero.matches.find((el) => el.uuid === matchPadre);
  while (matchAvo) {
    if (matchAvo.player1 === looser) {
      matchAvo.player1 = 0;
      matchAvo.p1Wins = false;
      matchAvo.p2Wins = false;
    }
    if (matchAvo.player2 === looser) {
      matchAvo.player2 = 0;
      matchAvo.p1Wins = false;
      matchAvo.p2Wins = false;
    }
    matchAvo = albero.matches.find((el) => el.uuid === matchAvo.fatherId);
  }
}

function aggiornaVincitore(comodino1, comodino2) {
  return (e) => {
    if (!winnersEditable) return;
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (e && typeof e.stopPropagation === "function") e.stopPropagation();
    captureScrollSnapshot(e.target);
    const playerCliccato = parseInt(e.target.parentElement.firstChild.id);
    if (playerCliccato < 1) return;

    const player1 = {};
    const player2 = {};
    player1.id = parseInt(
      e.target.parentElement.parentElement.querySelector('[data-posizione="1"]')
        .firstChild.id
    );
    player2.id = parseInt(
      e.target.parentElement.parentElement.querySelector('[data-posizione="2"]')
        .firstChild.id
    );
    player1.emoji = comodino1.textContent;
    player2.emoji = comodino2.textContent;

    if (
      player1.emoji === APP_ICONS.LOOSER &&
      player2.emoji === APP_ICONS.LOOSER
    ) {
      if (playerCliccato === player1.id) {
        player1.wins = true;
        player2.wins = false;
      } else if (playerCliccato === player2.id) {
        player1.wins = false;
        player2.wins = true;
      }
    } else if (
      player1.emoji === APP_ICONS.WINNER &&
      player2.emoji === APP_ICONS.WINNER
    ) {
      player1.wins = false;
      player2.wins = false;
    } else if (player1.emoji === APP_ICONS.LOOSER) {
      player1.wins = true;
      player2.wins = false;
    } else {
      player1.wins = false;
      player2.wins = true;
    }
    const treantNode = e.target.parentElement.parentElement.parentElement;
    const match = albero.matches.find((el) => el.uuid === treantNode.id);
    if (!match) {
      console.error("Match not found for", treantNode.id);
      return;
    }
    const prevP1Wins = match.p1Wins;
    const prevP2Wins = match.p2Wins;
    match.p1Wins = player1.wins;
    match.p2Wins = player2.wins;

    const fromRoundSelect = document.getElementById("fromRound").value;
    const toRoundSelect = document.getElementById("toRound").value;

    // Se siamo in finale (o comunque non c'è un match padre), non c'è nulla da propagare.
    // In precedenza qui si usciva senza re-render e la grafica non si aggiornava.
    if (!match.fatherId) {
      if (prevP1Wins !== match.p1Wins || prevP2Wins !== match.p2Wins) notifyTreeChanged();
      renderTree(fromRoundSelect, toRoundSelect);
      return;
    }

    //trasferisco il vincete al match successivo
    const destinazione = treantNode.dataset.fatherPosizione;
    const matchPadre = albero.matches.find((el) => el.uuid === match.fatherId);
    if (!matchPadre) {
      if (prevP1Wins !== match.p1Wins || prevP2Wins !== match.p2Wins) notifyTreeChanged();
      renderTree(fromRoundSelect, toRoundSelect);
      return;
    }
    if (!destinazione) {
      console.log("destinazione mancante");
      if (prevP1Wins !== match.p1Wins || prevP2Wins !== match.p2Wins) notifyTreeChanged();
      renderTree(fromRoundSelect, toRoundSelect);
      return;
    }
    let winner = 0;
    let looser = -1;
    player1.wins === false && player2.wins === true
      ? (winner = player2.id)
      : player1.wins === true && player2.wins === false
      ? (winner = player1.id)
      : (winner = 0);

    if (parseInt(destinazione) === 1) matchPadre.player1 = winner;
    if (parseInt(destinazione) === 2) matchPadre.player2 = winner;

    player1.wins === true
      ? (looser = player2.id)
      : player2.wins === true
      ? (looser = player1.id)
      : (looser = 0);

    matchPadre.p1Wins = false;
    matchPadre.p2Wins = false;

    if (looser > 0) cancellaPerdenteDaiTurniSuccessivi(looser, treantNode.id);

    if (prevP1Wins !== match.p1Wins || prevP2Wins !== match.p2Wins) notifyTreeChanged();
    renderTree(fromRoundSelect, toRoundSelect);
  };
}

export function arreda(piano, abita = true) {
  const stanze = document.getElementsByClassName(`treant-node round-${piano}`);
  for (const stanza of stanze) {
    const fatherId = albero.matches.find(
      (el) => el.uuid === stanza.id
    ).fatherId;
    stanza.dataset.fatherId = fatherId;
    stanza.dataset.fatherPosizione = destinazioneVincitore(fatherId, stanza.id);
    stanza.replaceChildren();

    const match = albero.matches.find((el) => el.uuid === stanza.id);

    const idGiocatore1 = match.player1 ? match.player1 : 0;
    const idGiocatore2 = match.player2 ? match.player2 : 0;

    const giocatore1 = players.find((pl) => pl.id === parseInt(idGiocatore1));
    const giocatore2 = players.find((pl) => pl.id === parseInt(idGiocatore2));

    const letto = costruisciLetto(giocatore1, giocatore2);

    const p1Wins = Boolean(match && match.p1Wins);
    const p2Wins = Boolean(match && match.p2Wins);
    if (p1Wins && !p2Wins) {
      setGiocatoreVincente(letto.firstChild.lastChild, letto.lastChild.lastChild);
    } else if (p2Wins && !p1Wins) {
      setGiocatoreVincente(letto.lastChild.lastChild, letto.firstChild.lastChild);
    }
    stanza.appendChild(letto);
  }
}
// Funzione per costruire e arredare l'albero
export function renderTree(fromRound, toRound) {
  const effectiveRounds = getEffectiveTournamentRounds(tournament);
  const snapshotScrollerId =
    lastScrollSnapshot && lastScrollSnapshot.scrollerId
      ? lastScrollSnapshot.scrollerId
      : "scroll-container";
  const scrollContainer = document.getElementById(snapshotScrollerId);
  const prevScrollTop =
    lastScrollSnapshot && typeof lastScrollSnapshot.containerTop === "number"
      ? lastScrollSnapshot.containerTop
      : scrollContainer
      ? scrollContainer.scrollTop
      : 0;
  const prevScrollLeft =
    lastScrollSnapshot && typeof lastScrollSnapshot.containerLeft === "number"
      ? lastScrollSnapshot.containerLeft
      : scrollContainer
      ? scrollContainer.scrollLeft
      : 0;
  const prevWindowScrollX =
    lastScrollSnapshot && typeof lastScrollSnapshot.windowX === "number"
      ? lastScrollSnapshot.windowX
      : window.scrollX;
  const prevWindowScrollY =
    lastScrollSnapshot && typeof lastScrollSnapshot.windowY === "number"
      ? lastScrollSnapshot.windowY
      : window.scrollY;

  const container = document.getElementById("tree-simple");
  container.innerHTML = "";
  const struttura = toTreantNodeStructure(albero, fromRound, toRound);
  if (!struttura) {
    container.innerHTML =
      "<p>Nessun match da mostrare nel range selezionato.</p>";
    return;
  }

  const chart_config = {
    chart: {
      container: "#tree-simple",
      rootOrientation: "EAST",
      nodeAlign: "BOTTOM",
      connectors: { type: "step" },
      node: { HTMLclass: "node" },
    },
    nodeStructure: struttura,
  };
  new Treant(chart_config);

  for (let j = fromRound; j >= toRound; j--) {
    arreda(j, j === effectiveRounds);
  }

  const restoreScroll = () => {
    if (scrollContainer) {
      scrollContainer.scrollTop = prevScrollTop;
      scrollContainer.scrollLeft = prevScrollLeft;
    }
    window.scrollTo(prevWindowScrollX, prevWindowScrollY);
  };

  // Treant può fare ulteriori reflow/aggiornamenti dopo il nostro render.
  // Ripristiniamo lo scroll più volte per evitare che la pagina torni in alto.
  requestAnimationFrame(() => {
    restoreScroll();
    requestAnimationFrame(() => {
      restoreScroll();
    });
  });
  setTimeout(restoreScroll, 0);
  setTimeout(restoreScroll, 50);
  setTimeout(restoreScroll, 200);

  lastScrollSnapshot = null;
}

export function populateRoundSelects(tournament, roundLabels) {
  const fromRoundSelect = document.getElementById("fromRound");
  const toRoundSelect = document.getElementById("toRound");

  // Pulisci gli select esistenti
  fromRoundSelect.innerHTML = "";
  toRoundSelect.innerHTML = "";

  const effectiveRounds = getEffectiveTournamentRounds(tournament);

  for (let i = effectiveRounds; i >= 1; i--) {
    const label = roundLabels[roundLabels.length - i] || `Round ${i}`;

    const optionFrom = document.createElement("option");
    optionFrom.value = i;
    optionFrom.textContent = `${label} (${i})`;
    fromRoundSelect.appendChild(optionFrom);

    const optionTo = document.createElement("option");
    optionTo.value = i;
    optionTo.textContent = `${label} (${i})`;
    toRoundSelect.appendChild(optionTo);
  }

  // Imposta valori di default (ultimo round per "from", primo round per "to")
  if (effectiveRounds > 0) {
    fromRoundSelect.value = effectiveRounds;
    toRoundSelect.value = 1;
  }
}
