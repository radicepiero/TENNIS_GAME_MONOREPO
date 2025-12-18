const db = require("../models");
const Player = db.Player;
const Ranking = db.Ranking;
/**
 * Recupera i giocatori dal database con eventuali filtri per ID, nome e data ranking.
 *
 * @param {Object} options - Opzioni per il filtraggio.
 * @param {number} [options.playerId] - ID numerico del giocatore (colonna `id`).
 * @param {string} [options.playerName] - Nome completo del giocatore (colonna `name`).
 * @param {string} [options.rankingDate] - Data ranking (es. "2025-05-01"), "*" per tutti, oppure `null` per la più recente.
 * @returns {Promise<Player[]>} Lista dei giocatori con ranking incluso (se presente).
 */
const readPlayers = async ({ playerId, playerName, rankingDate } = {}) => {
  try {
    const whereClause = {};

    if (playerId) {
      whereClause.id = playerId;
    } else if (playerName) {
      whereClause.name = playerName;
    }

    const includeRanking = {
      model: Ranking,
      required: false,
      attributes: ["date", "ranking"],
    };

    if (rankingDate === "*" || rankingDate === "all") {
      // nessun filtro sulla data dei ranking
    } else if (!rankingDate) {
      const maxDate = await Ranking.max("date");
      includeRanking.where = { date: maxDate };
    } else {
      includeRanking.where = { date: rankingDate };
    }

    const players = await Player.findAll({
      where: whereClause,
      include: [includeRanking],
      order: [[Ranking, "ranking", "ASC"]],
    });

    return players;
  } catch (error) {
    console.error("Errore durante il recupero dei giocatori:", error);
    throw error;
  }
};


module.exports = {
  readPlayers,
};
