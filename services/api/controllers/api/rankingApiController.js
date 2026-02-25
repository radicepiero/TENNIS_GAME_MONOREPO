const serviceRanking = require("../../services/rankingService");
const utils = require("../../services/utilsService");
const fs = require("fs");
const { importRankingFromCsv } = require("../../services/rankingImportService");

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

const getRankingDates = async (req, res) => {
  try {
    const dates = await serviceRanking.readRankingDates();
    res.status(200).json({ success: true, data: dates });
  } catch (error) {
    console.error("Errore nel recupero delle date ranking:", error);
    res.status(500).json({ error: "Errore nel recupero date ranking" });
  }
};

const importRankingCsv = async (req, res) => {
  const uploaded = req.file;
  const rankingDate = (req.body && req.body.ranking_date) || (req.query && req.query.ranking_date);

  if (!uploaded || !uploaded.path) {
    return res.status(400).json({ success: false, message: "File mancante" });
  }
  if (!rankingDate) {
    try {
      fs.unlinkSync(uploaded.path);
    } catch (e) {}
    return res.status(400).json({ success: false, message: "ranking_date mancante" });
  }

  try {
    const result = await importRankingFromCsv(uploaded.path, String(rankingDate));
    try {
      fs.unlinkSync(uploaded.path);
    } catch (e) {}
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    try {
      fs.unlinkSync(uploaded.path);
    } catch (e) {}
    const msg = error && error.message ? String(error.message) : "Errore import ranking";
    return res.status(500).json({ success: false, message: msg });
  }
};

module.exports = {
  getRanking,
  getFirstNPlayersOfAnyRankingDate,
  getRankingByDate,
  getRankingDates,
  importRankingCsv,
};
