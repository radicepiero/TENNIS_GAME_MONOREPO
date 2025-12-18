const db = require("../models");
const { Op } = require("sequelize");
//const { sequelize } = require("../models");
const Ranking = db.Ranking;
const Player = db.Player;
/**
 * Retrieves ranking records based on flexible query parameters.
 *
 * @async
 * @function readRanking
 * @param {Object} [queryParams={}] - An object containing query parameters.
 * @param {string} [queryParams.date] - Filter rankings by specific date (YYYY-MM-DD format).
 * @param {string} [queryParams.player_name] - Filter rankings by player name.
 * @param {number} [queryParams.ranking] - Filter by exact ranking position.
 * @param {number} [queryParams.ranking_min] - Filter by minimum ranking position (inclusive).
 * @param {number} [queryParams.ranking_max] - Filter by maximum ranking position (inclusive).
 * @param {Array[]} [queryParams.order] - Custom sorting order (e.g., [['ranking', 'ASC']]).
 * @param {number} [queryParams.limit] - Maximum number of records to return.
 * @param {number} [queryParams.offset] - Number of records to skip (for pagination).
 * @param {boolean} [queryParams.includePlayer] - Whether to include associated Player data.
 * @returns {Promise<Array>} A promise that resolves to an array of ranking records.
 * @throws {Error} If there's an error during the database query.
 *
 * @example
 * Get rankings for a specific date
 * await readRanking({ date: '2023-05-20' });
 *
 * @example
 * Get top 10 rankings for a player
 * await readRanking({
 *   player_name: 'Mario Rossi',
 *   order: [['date', 'DESC']],
 *   limit: 10
 * });
 *
 * @example
 * Get rankings between positions 5-15 with player data
 * await readRanking({
 *   ranking_min: 5,
 *   ranking_max: 15,
 *   includePlayer: true
 * });
 */
const readRanking = async (queryParams = {}) => {
  try {
    // Costruisco l'oggetto where basato sui parametri passati
    const whereClause = {};

    // Aggiungo i campi solo se sono presenti nei queryParams
    if (queryParams.date) whereClause.date = queryParams.date;
    if (queryParams.player_name)
      whereClause.player_name = queryParams.player_name;
    if (queryParams.ranking) whereClause.ranking = queryParams.ranking;

    // Aggiungo eventuali condizioni di range per il ranking
    if (queryParams.ranking_min || queryParams.ranking_max) {
      whereClause.ranking = {};
      if (queryParams.ranking_min)
        whereClause.ranking[Op.gte] = queryParams.ranking_min;
      if (queryParams.ranking_max)
        whereClause.ranking[Op.lte] = queryParams.ranking_max;
    }

    return await Ranking.findAll({
      where: whereClause,
      // Aggiungo l'ordinamento se specificato
      order: queryParams.order
        ? queryParams.order
        : [
            ["date", "DESC"],
            ["ranking", "ASC"],
          ],
      // Aggiungo il limite se specificato
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      // Aggiungo l'offset se specificato (per paginazione)
      offset: queryParams.offset ? parseInt(queryParams.offset) : undefined,
      // Include il modello Player se richiesto
      include: queryParams.includePlayer
        ? { model: Player, required: false }
        : undefined,
    });
  } catch (error) {
    console.error("Errore durante il recupero del ranking:", error);
    throw error; // Rilancia l'errore per gestirlo a livello superiore
  }
};

const readRankingByDate = async (date) => {
  console.log("date", date);
  try {
    return await Ranking.findAll({
      where: { date },
    });
  } catch (error) {
    console.error("errore durante il recupero del ranking");
  }
};

module.exports = {
  readRanking,
  readRankingByDate,
};
