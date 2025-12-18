const serviceRanking = require("../../services/rankingService");
const utils = require("../../services/utilsService");

const getRankingByDate = async (req, res) => {
  try {
    const date = req.params.date;
    const ranking = await serviceRanking.readRankingByDate(date);
    res.status(200).json({ success: true, data: ranking });
  } catch (error) {
    console.error("Errore nel recupero del ranking:", error);
    res.status(500).json({ error: "Errore nel recupero ranking" });
  }
};

const getFirstNPlayersOfAnyRankingDate = async (req, res) => {
  try {
    const NPlayers = req.params.NPlayers || 100;
    const result = await serviceRanking.readRanking({
      ranking_min: 1, // Solo i primi 100 ranking
      ranking_max: NPlayers,
      order: [
        ["date", "ASC"], // Ordina per data crescente
        ["ranking", "ASC"], // Poi per ranking crescente
      ],
    });
    console.log(result);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Errore nel recupero del ranking:", error);
    res.status(500).json({ error: "Errore nel recupero ranking" });
  }
};

const getRanking = async (req, res) => {
  try {
    const params = utils.sanitizeParams(req.query);
    console.log(params);
    const result = await serviceRanking.readRanking(params);
    console.log(result);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Errore nel recupero del ranking:", error);
    res.status(500).json({ error: "Errore nel recupero ranking" });
  }
};

module.exports = {
  getRanking,
  getFirstNPlayersOfAnyRankingDate,
  getRankingByDate,
};
