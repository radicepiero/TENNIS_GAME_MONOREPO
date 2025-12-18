import Player from "./Player.js";
import { normalizeKeys } from "./utils.js";
export class Ranking {
  constructor({ player_name, date, ranking, player = null }) {
    this.player_name = player_name;
    this.date = date instanceof Date ? date : new Date(date);
    this.ranking = ranking;
    if (player != null && !(player instanceof Player)) {
      throw new Error(
        "Il parametro 'player' deve essere un'istanza di Player oppure null."
      );
    }
    this.Player = player !== undefined ? player : this.player;
  }
  setPlayer(player) {
    if (!(player instanceof Player)) {
      throw new Error("Il parametro passato deve essere un'istanza di Player.");
    }
    this.player = player;
  }
  setDate(date) {
    if (!(date instanceof Date)) {
      throw new Error("La data deve essere un oggetto Date.");
    }
    this.date = date;
  }

  setRanking(value) {
    if (typeof value !== "number" || isNaN(value)) {
      throw new Error("Il ranking deve essere un numero.");
    }
    this.ranking = value;
  }

  static fromJSON(json) {
    const data = typeof json === "string" ? JSON.parse(json) : { ...json };

    // Deserializzazione condizionale del player
    if (data.player && !(data.player instanceof Player)) {
      data.player = new Player(data.player);
    }

    // Conversione della data se necessario
    if (typeof data.date === "string") {
      data.date = new Date(data.date);
    }

    return new Ranking(data);
  }

  toJSON() {
    return {
      player_name: this.player_name,
      date: this.date.toISOString().split("T")[0],
      ranking: this.ranking,
    };
  }

  /**
   * Interroga il servizio `readRanking` con parametri flessibili
   *  * @param {Object} [queryParams={}] - An object containing query parameters.
   * @param {string} [queryParams.API] - dominio del web service
   * @param {string} [queryParams.date] - Filter rankings by specific date (YYYY-MM-DD format).
   * @param {string} [queryParams.player_name] - Filter rankings by player name.
   * @param {number} [queryParams.ranking] - Filter by exact ranking position.
   * @param {number} [queryParams.ranking_min] - Filter by minimum ranking position (inclusive).
   * @param {number} [queryParams.ranking_max] - Filter by maximum ranking position (inclusive).
   * @param {Array[]} [queryParams.order] - Custom sorting order (e.g., [['ranking', 'ASC']]).
   * @param {number} [queryParams.limit] - Maximum number of records to return.
   * @param {number} [queryParams.offset] - Number of records to skip (for pagination).
   * @param {boolean} [queryParams.includePlayer] - Whether to include associated Player data.
   * @returns {Promise<Ranking[]>}
   * esempi di URL:
   * Filtra tutte le classifiche del 25 maggio 2025
   * /api/rankings?date=2025-05-25
   * Ranking di un giocatore specifico
   * /api/rankings?player_name=Mario%20Rossi
   * Mostra tutti i giocatori che sono arrivati primi (ranking 1)
   * /api/rankings?ranking=1
   * Mostra tutte le classifiche dalla 5ª alla 15ª posizione
   * /api/rankings?ranking_min=5&ranking_max=15
   * Ordina per data decrescente, e prende solo i 10 record più recenti
   * /api/rankings?player_name=Mario%20Rossi&order[0][0]=date&order[0][1]=DESC&limit=10
   * Ordina tutti i record per ranking crescente
   * /api/rankings?order[0][0]=ranking&order[0][1]=ASC
   * Mostra la terza pagina di risultati (10 per pagina → offset = 20)
   * /api/rankings?limit=10&offset=20
   * Include i dati del modello Player associato al Ranking
   * /api/rankings?includePlayer=true
   * Ottieni le prime 5 classifiche recenti di Mario Rossi con ranking da 1 a 5, includendo anche i dati Player
   * /api/rankings?player_name=Mario%20Rossi&ranking_min=1&ranking_max=5&order[0][0]=date&order[0][1]=DESC&limit=5&includePlayer=true
   */
  static async query(queryParams = {}) {
    try {
      // Preparazione parametri
      const params = new URLSearchParams();
      const apiUrl = queryParams.API;
      delete queryParams.API;

      // Aggiunta parametri alla query
      for (const [key, value] of Object.entries(queryParams)) {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      }

      // Fetch dei dati
      const response = await fetch(`${apiUrl}/rankings?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message ||
            `Errore HTTP: ${response.status} ${response.statusText}`
        );
      }
      const { success, data: responseData } = normalizeKeys(
        await response.json(),
        { Player: "player" }
      );
      if (!success) {
        throw new Error("Errore nella risposta API: success=false");
      }

      // Deserializzazione usando fromJSONArray
      return Ranking.fromJSONArray(responseData, {
        strictValidation: true, // Fallisce se un elemento non è valido
        dateFormat: "iso", // Specifica il formato della data
      });
    } catch (error) {
      console.error("Errore in Ranking.query:", error);
      throw new Error(`Impossibile recuperare i ranking: ${error.message}`);
    }
  }

  /**
   * Salva una nuova entry di ranking nel database
   */
  async save() {
    const res = await fetch(`/api/rankings`, {
      method: "POST",
      //credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.toJSON()),
    });
    if (!res.ok) throw new Error("Errore nel salvataggio ranking");
    const data = await res.json();
    Object.assign(this, Ranking.fromJSON(data));
  }

  static fromJSONArray(jsonArray, options = {}) {
    const {
      skipInvalid = true, // Ignora elementi non validi invece di fallire
      strictValidation = false, // Validazione più rigorosa
    } = options;

    const parsed =
      typeof jsonArray === "string" ? JSON.parse(jsonArray) : jsonArray;

    if (!Array.isArray(parsed)) {
      if (strictValidation) throw new Error("Input must be an array");
      return [];
    }
    const result = parsed
      .map((item) => {
        try {
          return this.fromJSON(item); // Chiama il metodo statico esistente
        } catch (error) {
          if (!skipInvalid) throw error;
          console.warn("Invalid ranking item skipped:", error);
          return null;
        }
      })
      .filter(Boolean); // Rimuove i null
    //console.log("result", result);
    return result;
  }
}
