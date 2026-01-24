import { countryToFlag } from "./icons.js";

class PlayerCard {
  constructor(player) {
    this.player = player;
    this.element = this.createPlayerElement();
  }

  createPlayerElement() {
    const div = document.createElement("div");
    div.id = `player-${this.player.name}`;
    div.classList.add("player");

    const img = document.createElement("img");
    img.src = this.player.image_src || "default.jpg";
    img.alt = this.player.image_alt || this.player.name;

    const playerId = this.player && this.player.id !== undefined && this.player.id !== null ? String(this.player.id) : "";
    const friendHref = playerId ? `/friend/player/${encodeURIComponent(playerId)}` : "";

    const imgWrap = document.createElement(friendHref ? "a" : "div");
    if (friendHref) {
      imgWrap.href = friendHref;
      imgWrap.style.textDecoration = "none";
    }
    imgWrap.appendChild(img);

    const punteggio = document.createElement("div");

    punteggio.textContent = this.player.Rankings.length
      ? `${this.player.Rankings[0].ranking} : ${this.player.puntiSemifinalist} / ${this.player.puntiWinner}`
      : "N/D";

    const label = document.createElement("label");
    label.textContent = this.player.name;

    const labelWrap = document.createElement(friendHref ? "a" : "div");
    if (friendHref) {
      labelWrap.href = friendHref;
      labelWrap.style.textDecoration = "none";
      labelWrap.style.color = "inherit";
    }
    labelWrap.appendChild(label);

    const country = document.createElement("div");
    const c = this.player && this.player.country ? String(this.player.country) : "";
    const flag = c ? countryToFlag(c) : "";
    country.textContent = c ? `${flag ? `${flag} ` : ""}${c}` : "";

    div.append(punteggio, imgWrap, checkbox, labelWrap, country);
    return div;
  }

  getElement() {
    return this.element;
  }
}



async function fetchTournament(tournament_id, apiUrl) {
  try {
    let response = await fetch(
      `${apiUrl}/tournaments/${tournament_id}/scripts`,
      {
        method: "GET",
        //credentials: "include", // <<< necessario
      }
    );
    return await response.json();
  } catch (error) {
    console.error(error);
  }
}
async function fetchTournamentPredictions(tournamentId, apiUrl) {
  try {
    console.log("apiUrl", apiUrl);
    const url = `${apiUrl}/predictions/tournaments/${tournamentId}`;
    const pred = await fetch(url);
    const { data } = await pred.json();
    return data;
  } catch (error) {
    console.error("Errore nel recupero delle prediction:", error);
  }
}

async function fetchTournamentUserPredictions(tournamentId, apiUrl) {
  try {
    const url = `${apiUrl}/predictions/tournaments/${tournamentId}`;
    const pred = await fetch(url);
    if (!pred.ok) predictionEsiste = false;
    const { data } = await pred.json();
    if (data[0].rows) {
      predictionEsiste = true;
      return data[0].rows;
    }
  } catch (error) {
    console.error("Errore nel recupero della prediction:", error);
  }
}

async function fetchPredictionLoggedUser(tournamentId, apiUrl) {
  try {
    const url = `${apiUrl}/predictions/tournaments/${tournamentId}/user`;
    const pred = await fetch(url);
    const { data } = await pred.json();
    if (data[0].rows) {
      return data[0].rows;
    }
  } catch (error) {
    console.error("Errore nel recupero della prediction:", error);
  }
}

//funzione per trasformare la predizione prodotta dall'API nella predizione usata dalla UI

const convertPredictionToSemifinalist = async (predictionRow) => {
  const player = await players.find(
    (player) => player.id === predictionRow.player_id
  );
  if (!player) {
    console.error("Player not found for id:", predictionRow.player_id);
    return null;
  }
  player.prediction = predictionRow.prediction;
  return player;
};

async function predictionApiToPredictionUI(predictionAPI, players, users) {
  /*
    predictionApi:


    predictionUI:
    */
  const predictionUI = {};
  return predictionUI;
}

async function fetchTournamentUsers(tournamentId, apiUrl) {
  try {
    //  "/:tournamentId/users/:userId"
    const url = `${apiUrl}/tournaments/${tournamentId}/users`;
    const pred = await fetch(url);
    const { data } = await pred.json();
    return data;
  } catch (error) {
    console.error("Errore nel recupero delle prediction:", error);
  }
}

export {
  PlayerCard,
  fetchPlayers,
  fetchTournament,
  fetchTournamentUserPredictions,
  fetchTournamentPredictions,
  fetchPredictionLoggedUser,
  fetchTournamentUsers,
};
