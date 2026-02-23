import { playerApi } from "../api/playerApi.js";
import { extractJsFunctionBody } from "../utils.js";

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

  // Altri metodi di utilità (es. per validazione)
  isValid() {
    return this.name && this.name.length > 0;
  }

  /**
   * Fetches players based on tournament ranking date and applies tournament scripts.
   * @param {Tournament} tournament - The tournament object.
   * @param {string} apiUrl - The base API URL.
   * @returns {Promise<Player[]>} - The list of players with updated scores.
   */
  static async fetchByTournament(tournament, apiUrl) {
    try {
      const rankingDate = tournament && tournament.ranking_date ? String(tournament.ranking_date).slice(0, 10) : null;

      const [rankingRows, allRows] = await Promise.all([
        playerApi.getPlayersByRankingDate(rankingDate, apiUrl),
        playerApi.listPlayers(apiUrl).catch(() => []),
      ]);

      const rankingPlayers = (rankingRows || []).map((p) => Player.fromJSON(p));
      const allPlayers = (allRows || []).map((p) => Player.fromJSON(p));

      const byId = new Map();
      // prefer rankingPlayers because they include Rankings
      rankingPlayers.forEach((p) => byId.set(String(p.id), p));
      allPlayers.forEach((p) => {
        const key = String(p.id);
        if (!byId.has(key)) byId.set(key, p);
      });

      const players = Array.from(byId.values());

      if (tournament.Scripts?.length) {
        const winnerScript = tournament.Scripts.find(
          (el) => el.name === "punteggioWinner"
        );
        const semifinalistScript = tournament.Scripts.find(
          (el) => el.name === "punteggioSemifinalist"
        );

        const punteggioWinner = new Function(
          "ranking",
          extractJsFunctionBody(winnerScript?.script || "{}")
        );
        const punteggioSemifinalist = new Function(
          "ranking",
          extractJsFunctionBody(semifinalistScript?.script || "{}")
        );

        players.forEach((player) => {
          if (player.Rankings?.length) {
            const ranking = player.Rankings[0].ranking;
            player.puntiSemifinalist = punteggioSemifinalist(ranking);
            player.puntiWinner = punteggioWinner(ranking);
          } else {
            player.puntiSemifinalist = 0;
            player.puntiWinner = 0;
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
