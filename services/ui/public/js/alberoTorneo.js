// /js/alberoTorneo.js
import { Tree } from "/js/Tree.js";
import Player from "/js/Player.js";
import { PennaDialogo } from "/js/pennaDialogo.js";
import { toTreantNodeStructure } from "/js/TreeTreantAdapter.js";
import { treeApiClient } from "/js/TreeApiClient.js";
export const emojiWinner = "👍";
export const emojiLooser = "👎";
let players = {};
let albero = {};
let dialog = {};
let tournament = {};
let user = {};
let apiUrl = "";

export const roundLabels = [
  "128-esimi",
  "64-esimi",
  "32-esimi",
  "16-esimi",
  "Ottavi",
  "Quarti",
  "Semifinali",
  "Finali",
];

export async function setup(torneo, utente, _apiUrl) {
  tournament = torneo;
  user = utente;
  apiUrl = _apiUrl;
  players = await Player.fetchByTournament(tournament, apiUrl);
  const giocatoreNull = new Player({
    id: 0,
    name: "🫸 giocatore da stabilire",
  });
  giocatoreNull.createInfoElement = function () {
    const playerDiv = document.createElement("div");
    playerDiv.id = this.id;
    playerDiv.className = "player";
    const nameDiv = document.createElement("span");
    nameDiv.textContent = this.name;
    playerDiv.append(nameDiv);
    return playerDiv;
  };
  players.push(giocatoreNull);
}

export function genera() {
  albero = Tree.generate({
    name: `${new Date()} ${user.soprannome || user.email}`,
    tournament: tournament,
    ownerId: user.uuid,
    numPlayers: 2 ** tournament.rounds,
  });
  dialog = new PennaDialogo("#dialogContainer", { options: players });
  renderTree(tournament.rounds, 1);
}

export async function getAlberoMatches(treeId) {
  albero = await treeApiClient.fetchAndImportTree(treeId, apiUrl);
  return albero;
}
//la funzione chiede genericamente gli alberi all'api, sarà lei a selezionare quali alberi saranno messi a disposizione.
export async function getAlberi(tournament) {
  return await treeApiClient.getTrees(
    { tournamentId: tournament.id, includeMatches: false },
    apiUrl
  );
}

export async function deleteAlbero() {
  //console.log("albero.id", albero.uuid);
  return await treeApiClient.deleteTree(albero.uuid, apiUrl);
}

export async function saveAlbero() {
  try {
    const result = await treeApiClient.saveTree(albero, apiUrl);
    return result; // puoi gestire qui il risultato
  } catch (error) {
    console.error("Errore durante il salvataggio dell'albero:", error.message);
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
  const newElement = player.createInfoElement();
  newElement.addEventListener("click", handlePlayerClick);
  return newElement;
}

function handlePlayerClick(event) {
  event.stopPropagation();
  // Verifica il round PRIMA di aprire il dialog
  const clickedRound = getRoundTreantNode(
    event.currentTarget.parentElement.parentElement.parentElement
  );
  console.log("clickedRound", clickedRound);
  console.log("tournament.rounds", tournament.rounds);
  if (clickedRound !== tournament.rounds) {
    return; // Esci subito se non è il round giusto
  }
  dialog.open({
    operazione: ((clickedElement) => {
      return function (selectedPlayer) {
        if (
          getRoundTreantNode(
            clickedElement.parentElement.parentElement.parentElement
          ) !== tournament.rounds
        )
          return;
        const container = clickedElement.parentElement;
        const newElement = setupPlayerElement(selectedPlayer);
        container.replaceChild(newElement, clickedElement);
        const matchInCorso = albero.matches.find(
          (el) => el.uuid === container.parentElement.parentElement.id
        );
        if (parseInt(container.dataset.posizione) === 1) {
          matchInCorso.player1 = parseInt(
            container.firstChild.dataset.playerid
          );
        }
        if (parseInt(container.dataset.posizione) === 2) {
          matchInCorso.player2 = parseInt(
            container.firstChild.dataset.playerid
          );
        }
      };
    })(event.currentTarget),
  });
}

export function creaComodino(onClick = () => {}) {
  const comodino = document.createElement("span");
  comodino.className = "toggle-winner";
  comodino.textContent = emojiLooser;
  comodino.addEventListener("click", onClick);
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
  vincente.textContent = emojiWinner;
  perdente.textContent = emojiLooser;
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

    if (player1.emoji === emojiLooser && player2.emoji === emojiLooser) {
      if (playerCliccato === player1.id) {
        player1.wins = true;
        player2.wins = false;
      } else if (playerCliccato === player2.id) {
        player1.wins = false;
        player2.wins = true;
      }
    } else if (player1.emoji === emojiWinner && player2.emoji === emojiWinner) {
      player1.wins = false;
      player2.wins = false;
    } else if (player1.emoji === emojiLooser) {
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
    match.p1Wins = player1.wins;
    match.p2Wins = player2.wins;
    //trasferisco il vincete al match successivo
    const destinazione = treantNode.dataset.fatherPosizione;
    const matchPadre = albero.matches.find((el) => el.uuid === match.fatherId);
    if (!matchPadre) {
      console.error("Parent match not found for", match.fatherId);
      return;
    }
    if (!destinazione) {
      console.log("destinazione mancante");
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

    const fromRoundSelect = document.getElementById("fromRound").value;
    const toRoundSelect = document.getElementById("toRound").value;

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

    if (match.p1Wins === true) {
      setGiocatoreVincente(
        letto.firstChild.lastChild,
        letto.lastChild.lastChild
      );
    }
    if (match.p2Wins === true)
      setGiocatoreVincente(
        letto.lastChild.lastChild,
        letto.firstChild.lastChild
      );
    stanza.appendChild(letto);
  }
}
// Funzione per costruire e arredare l'albero
export function renderTree(fromRound, toRound) {
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
    arreda(j, j === tournament.rounds);
  }
}

export function populateRoundSelects(tournament, roundLabels) {
  const fromRoundSelect = document.getElementById("fromRound");
  const toRoundSelect = document.getElementById("toRound");

  // Pulisci gli select esistenti
  fromRoundSelect.innerHTML = "";
  toRoundSelect.innerHTML = "";

  for (let i = tournament.rounds; i >= 1; i--) {
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
  if (tournament.rounds > 0) {
    fromRoundSelect.value = tournament.rounds;
    toRoundSelect.value = 1;
  }
  fromRoundSelect.value = tournament.rounds;
  toRoundSelect.value = 1;
}
