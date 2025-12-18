//import { predictions } from "./predictionsMiami.js";
import { playersTurni } from "./playersTurniMontecarlo.js";
//import { players } from "./players.js";

import {
  PlayerCard,
  fetchPlayers,
  fetchTournament,
  fetchTournamentPredictions,
  fetchTournamentUsers,
  fetchTournamentUserPredictions,
  fetchPredictionLoggedUser,
} from "./playerCard.js";

const punteggi = [];

function risultatoTurno(playerNome, turnoChar) {
  const turno = parseInt(turnoChar);
  const giocatore = playersTurni.find((player) => player.nome === playerNome);
  if (!giocatore) console.error("Giocatore non trovato", playerNome);
  switch (turno) {
    case 1:
    case 2:
    case 3:
    case 4:
      if (giocatore.turno > turno) return "ok";
      if (giocatore.turno < turno) return "uscito";
      if (giocatore.turno == turno && !giocatore.giocato) return "inGara";
      if (giocatore.turno == turno && giocatore.giocato && giocatore.vinto)
        return "ok";
      if (giocatore.turno == turno && giocatore.giocato && !giocatore.vinto)
        return "esce";
      break;
    case 5:
      if (giocatore.turno > turno) return "ok";
      if (giocatore.turno < 5) return "uscito";
      if (giocatore.turno == turno && !giocatore.giocato) return "inGara";
      if (giocatore.turno == turno && giocatore.giocato && giocatore.vinto)
        return "ok";
      if (giocatore.turno == turno && giocatore.giocato && !giocatore.vinto)
        return "semif";
    case 6:
      //if (giocatore.turno > turno) return "ok"; aso che non esiste
      if (giocatore.turno < 5) return "uscito";
      if (giocatore.turno === 5) return "semif";
      if (giocatore.turno === turno && !giocatore.giocato) return "semif";
      if (giocatore.turno === turno && giocatore.giocato && giocatore.vinto)
        return "ok";
      if (giocatore.turno == turno && giocatore.giocato && !giocatore.vinto)
        return "finalist";
      break;
  }
}
// Assumendo che tu abbia una funzione per aggiungere i giocatori alla DOM
function aggiornaStileGiocatore(playerElement, risultatoTurno) {
  if (!playerElement) return;

  // Rimuovi tutte le classi specifiche
  playerElement.classList.remove("hidden", "transparent", "highlight");

  // Applica lo stile in base al risultatoTurno
  switch (risultatoTurno) {
    case "uscito":
      playerElement.classList.add("hidden");
      break;
    case "inGara":
      playerElement.classList.add("transparent");
      break;
    case "semif":
      playerElement.classList.add("transparent");
      break;
    case "esce": //il caso esce non si verifica in semifinale
      playerElement.classList.add("highlight");
      break;
    case "winn":
      playerElement.classList.add("highlight");
      break;
    case "finalist":
    case "ok":
    default:
      // Nessuna modifica
      break;
  }
}
function calcolaPunteggioGiocatore(turno, playerNome) {
  switch (risultatoTurno(playerNome, turno)) {
    case "uscito":
      return false;
    case "esce":
      return false;
    case "inGara":
      return true;
    case "semif":
      return true;
    case "ok":
      return true;
    case "finalist":
      return true;
    default:
      return false;
  }
}
//FUNZIONE CHE CREA UNA CELLA PER CIASCUN GIOCATORE DEL PRONOSTICO
function createCell(turno, playerNome, isWinner = false) {
  const giocatore = playersTurni.find((player) => player.nome === playerNome);
  const cell = document.createElement("div");
  const semif = risultatoTurno(giocatore.nome, turno);
  cell.className = isWinner ? "winner" : "cell";
  console.log("mod: ", playerNome, "semif", semif);

  aggiornaStileGiocatore(cell, risultatoTurno(giocatore.nome, turno));
  cell.innerHTML = `
  <div class="title">${""}</div>
  <div class="title">punti: ${
    isWinner
      ? puntiRankingWinner(players[playerNome].ranking)
      : puntiRankingSemi(players[playerNome].ranking)
  }</div>
  <div class="player">
    <img src="${players[playerNome].img}" alt="${playerNome}" />
    ${playerNome}
  </div>
  <div class="title">classifica: ${players[playerNome].ranking}</div>
`;

  return cell;
}

export async function creaColonne(tournamentID, turno, apiUrl) {
  let tournament = {};
  let players = [];
  let predictions = [];
  let risultati = playersTurni; //da sostituire poi con un fetch a db quando avremo organizzato i risultati
  try {
    //console.log(",,,,,,,,", await fetchTournament(tournamentID));
    tournament = (await fetchTournament(tournamentID, apiUrl)).data[0];
    //console.log(",,,,,,,,", tournament);
  } catch (error) {
    console.log(error);
  }
  try {
    players = await fetchPlayers(tournament, apiUrl);
    //console.log(players);
  } catch (error) {
    console.log(error);
  }
  try {
    predictions = await fetchTournamentPredictions(tournamentID, apiUrl);
    console.log(predictions);
  } catch (error) {
    console.log(error);
  }

  const columnContainer = document.getElementById("columns");

  predictions.forEach((prediction) => {
    //creazione header con dati dello scommettitore
    punteggi[prediction.user_uuid] = 0;

    const column = document.createElement("div");
    column.className = "column";

    const headerCell = document.createElement("div");
    headerCell.className = "header-cell";
    const userImg = prediction.img || prediction.user_image_url;
    const userName = prediction.user_soprannome || prediction.user_email;
    headerCell.innerHTML = `
    <img src="${userImg}" alt="Immagine ${userName}" />
    ${userName}
    `;
    column.appendChild(headerCell);
    const punteggioCell = document.createElement("div");
    punteggioCell.className = "punteggio";
    headerCell.appendChild(punteggioCell);
    //creazione della pila dei tennisti
    const content = document.createElement("div");
    content.className = "content";

    const _winner = prediction.rows.find(
      (row) => row.prediction === "winner"
    )?.player_id;
    const _semifinalists = prediction.rows
      .filter((row) => row.prediction === "semifinalist")
      .map((row) => row.player_id);
    const winner = players.find((p) => p.id === _winner);
    const semi1 = players.find((p) => p.id === _semifinalists[0]);
    const semi2 = players.find((p) => p.id === _semifinalists[1]);
    const semi3 = players.find((p) => p.id === _semifinalists[2]);
    //vincitore
    if (winner.name) {
      const semif = risultatoTurno(winner.name, turno);
      if (semif === "semif") {
        content.appendChild(createCell(turno, "VINCITORE", winner.name, false));
        punteggi[prediction.name] +=
          calcolaPunteggioGiocatore(turno, winner.name) *
          puntiRankingSemi(players[winner.name].ranking);
      } else {
        content.appendChild(createCell(turno, "VINCITORE", winner.name, true));
        punteggi[prediction.name] +=
          calcolaPunteggioGiocatore(turno, winner.name) *
          puntiRankingWinner(players[winner.name].ranking);
      }
    }
    //semifinalista
    if (semi1.name) {
      content.appendChild(createCell(turno, "ALTRO SEMIFINALISTA", semi1.name));
      punteggi[prediction.user_uuid] +=
        calcolaPunteggioGiocatore(turno, semi1.name) *
        puntiRankingSemi(players[semi1.name].ranking);
    }
    //semifinalista
    if (semi2.name) {
      content.appendChild(createCell(turno, "ALTRO SEMIFINALISTA", semi2.name));
      punteggi[prediction.user_uuid] +=
        calcolaPunteggioGiocatore(turno, semi2.name) *
        puntiRankingSemi(players[semi2.name].ranking);
    }
    //semifinalista
    if (semi3.name) {
      content.appendChild(createCell(turno, "ALTRO SEMIFINALISTA", semi3.name));
      punteggi[prediction.user_uuid] +=
        calcolaPunteggioGiocatore(turno, semi3.name) *
        puntiRankingSemi(players[semi3.name].ranking);
    }
    punteggioCell.innerHTML = `${punteggi[prediction.user_uuid]}`;
    column.appendChild(content);
    columnContainer.appendChild(column);
  });
}
