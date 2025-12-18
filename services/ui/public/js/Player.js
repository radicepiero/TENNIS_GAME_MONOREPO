export default class Player {
  constructor({
    id = null,
    name = "----",
    first_name = "----",
    second_name = "----",
    country = "",
    profile_url = "",
    image_src = "",
    image_alt = "",
    created_at = new Date().toISOString(),
    Rankings = [{ date: null, ranking: -1 }],
    puntiSemifinalist = 0,
    puntiWinner = 0,
  } = {}) {
    this.id = id;
    this.name = name;
    this.first_name = first_name;
    this.second_name = second_name;
    this.country = country;
    this.profile_url = profile_url;
    this.image_src = image_src;
    this.image_alt = image_alt;
    this.created_at = created_at;
    this.Rankings = Rankings;
    this.puntiSemifinalist = puntiSemifinalist;
    this.puntiWinner = puntiWinner;
  }

  // Metodo per creare un Player da una risposta API (JSON)
  static fromJSON(json) {
    return new Player({
      id: json.id,
      name: json.name,
      first_name: json.first_name,
      second_name: json.second_name,
      country: json.country,
      profile_url: json.profile_url,
      image_src: json.image_src,
      image_alt: json.image_alt,
      created_at: json.created_at,
      Rankings: json.Rankings,
      puntiSemifinalist: json.puntiSemifinalist,
      puntiWinner: json.puntiWinner,
    });
  }

  // Metodo per esportare i dati come oggetto semplice (per invii API)
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      first_name: this.first_name,
      second_name: this.second_name,
      country: this.country,
      profile_url: this.profile_url,
      image_src: this.image_src,
      image_alt: this.image_alt,
      created_at: this.created_at,
    };
  }

  // Metodo di utilità per visualizzazione (esempio)
  getDisplayName() {
    return `${this.name}${this.country ? " (" + this.country + ")" : ""}`;
  }

  // Altri metodi di utilità (es. per validazione)
  isValid() {
    return this.name && this.name.length > 0;
  }

  /**
   * Crea una card HTML che rappresenta il giocatore.
   * @returns {HTMLElement} L'elemento DOM della card del giocatore.
   */
  createPlayerCard() {
    const div = document.createElement("div");
    div.id = `${this.id}`;
    div.classList.add("player");

    const img = document.createElement("img");
    img.src = this.image_src || "default.jpg";
    img.alt = this.image_alt || this.name;

    const punteggio = document.createElement("div");
    punteggio.textContent = this.Rankings?.length
      ? `${this.Rankings[0].ranking} : ${this.puntiSemifinalist} / ${this.puntiWinner}`
      : "N/D";

    const label = document.createElement("label");
    label.textContent = this.name;

    const country = document.createElement("div");
    country.textContent = this.country;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = `select-${this.name}`;

    div.append(punteggio, img, checkbox, label, country);
    return div;
  }

  createInfoElement() {
    // 2. Crea il blocco HTML del giocatore
    const playerDiv = document.createElement("div");
    playerDiv.id = this.id;
    playerDiv.className = "player";
    playerDiv.dataset.playerid = this.id;
    const img = document.createElement("img");
    img.className = "player-avatar";
    img.src = this.image_src;
    img.alt = `${this.image_alt}`;

    const nameDiv = document.createElement("span");
    nameDiv.textContent = this.name;

    const ratingDiv = document.createElement("span");
    ratingDiv.textContent = `[${this.Rankings[0].ranking}] `;

    const prizeDiv = document.createElement("span");
    prizeDiv.textContent = ` {${this.puntiWinner}/${this.puntiSemifinalist}}`;

    playerDiv.append(ratingDiv, img, nameDiv, prizeDiv);
    return playerDiv;
  }

  /**
   * Fetches players based on tournament ranking date and applies tournament scripts.
   * @param {Tournament} tournament - The tournament object.
   * @param {string} apiUrl - The base API URL.
   * @returns {Promise<Player[]>} - The list of players with updated scores.
   */
  static async fetchByTournament(tournament, apiUrl) {
    try {
      const response = await fetch(
        `${apiUrl}/players/ranking/${tournament.ranking_date}`
      );
      if (!response.ok) {
        throw new Error("Errore nel caricamento dei giocatori");
      }

      const players = (await response.json()).data.map((p) =>
        Player.fromJSON(p)
      );

      if (tournament.Scripts?.length) {
        const winnerScript = tournament.Scripts.find(
          (el) => el.name === "punteggioWinner"
        );
        const semifinalistScript = tournament.Scripts.find(
          (el) => el.name === "punteggioSemifinalist"
        );

        const extractFunctionBody = (fnString) => {
          const match = fnString.match(/{([\s\S]*)}/);
          return match ? match[1].trim() : "";
        };

        const punteggioWinner = new Function(
          "ranking",
          extractFunctionBody(winnerScript?.script || "{}")
        );
        const punteggioSemifinalist = new Function(
          "ranking",
          extractFunctionBody(semifinalistScript?.script || "{}")
        );

        players.forEach((player) => {
          if (player.Rankings?.length) {
            const ranking = player.Rankings[0].ranking;
            player.puntiSemifinalist = punteggioSemifinalist(ranking);
            player.puntiWinner = punteggioWinner(ranking);
          }
        });
      }

      return players;
    } catch (error) {
      console.error("Errore nel metodo Player.fetchByTournament:", error);
      return [];
    }
  }
}
