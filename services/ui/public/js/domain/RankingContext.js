import { normalizeYmd } from "../utils.js";

/**
 * Centralizza la gestione della "ranking date".
 *
 * Contesto:
 * - Un torneo può avere al massimo una `ranking_date` (YYYY-MM-DD).
 * - Un giocatore può avere 0..N `Rankings`.
 * - Ogni record di ranking deve includere la proprietà `date`.
 */
export default class RankingContext {
  /**
   * @param {string|Date|null} rankingDate Data di riferimento (verrà normalizzata a YYYY-MM-DD).
   */
  constructor(rankingDate) {
    this.date = normalizeYmd(rankingDate);
  }

  /**
   * Factory comoda per costruire il contesto direttamente dal torneo.
   * @param {Object|null} tournament
   * @returns {RankingContext}
   */
  static fromTournament(tournament) {
    return new RankingContext(tournament && tournament.ranking_date ? tournament.ranking_date : null);
  }

  /**
   * @returns {boolean} true se la data di ranking del torneo è presente e valida.
   */
  hasDate() {
    return Boolean(this.date);
  }

  /**
   * Converte un ranking "raw" in numero.
   * Accetta anche valori stringa (es. "12", "#12", "pos 12").
   * @param {any} rawRanking
   * @returns {number|null}
   */
  parseRankingNumber(rawRanking) {
    let ranking = Number(rawRanking);
    if (!Number.isFinite(ranking)) {
      const m = String(rawRanking).match(/\d+/);
      ranking = m ? Number(m[0]) : NaN;
    }
    return Number.isFinite(ranking) ? ranking : null;
  }

  /**
   * Verifica se il player ha un ranking per la data del contesto.
   * @param {Object|null} player
   * @returns {boolean}
   */
  hasRankingForPlayer(player) {
    if (!this.date) return false;
    if (!player || !Array.isArray(player.Rankings) || player.Rankings.length === 0) return false;

    return Boolean(player.Rankings.find((r) => r && r.date && normalizeYmd(r.date) === this.date));
  }

  /**
   * Seleziona il ranking corretto del player per la data del contesto.
   *
   * Regole:
   * - Se c'è una data nel contesto e i Rankings includono `date`, cerca il record esatto.
   * - Se non trova il record per la data, ritorna null.
   * - Fallback: se `player.ranking` esiste, usa quello.
   *
   * @param {Object|null} player
   * @returns {number|null}
   */
  getPlayerRanking(player) {
    if (!player) return null;

    const rankings = Array.isArray(player.Rankings) ? player.Rankings : [];
    const targetDate = this.date;

    if (rankings.length) {
      let chosen = null;
      if (targetDate) {
        chosen = rankings.find((r) => r && r.date && normalizeYmd(r.date) === targetDate) || null;
        if (!chosen) return null;
      } else {
        chosen = rankings[0];
      }
      if (chosen && typeof chosen.ranking !== "undefined") {
        return this.parseRankingNumber(chosen.ranking);
      }
    }

    if (typeof player.ranking !== "undefined") return this.parseRankingNumber(player.ranking);
    return null;
  }

  /**
   * Helper per UI: ritorna una diagnostica sintetica sul motivo per cui
   * non si riesce a calcolare un ranking valido.
   *
   * @param {Object|null} player
   * @returns {{issue: boolean, reason: (string|null), ranking?: (number|null)}}
   */
  getRankingIssue(player) {
    if (!this.date) return { issue: true, reason: "missing_tournament_ranking_date" };
    if (!player) return { issue: true, reason: "missing_player" };

    const has = this.hasRankingForPlayer(player);
    const r = has ? this.getPlayerRanking(player) : null;

    if (!has) return { issue: true, reason: "player_has_no_ranking_for_date" };
    if (r === null) return { issue: true, reason: "ranking_not_numeric" };

    return { issue: false, reason: null, ranking: r };
  }
}
