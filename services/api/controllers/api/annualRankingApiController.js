const annualRankingService = require("../../services/annualRankingService");

const getAnnualRanking = async (req, res) => {
  try {
    const year = req.params.year;
    const roomId = req.query && (req.query.room_id || req.query.roomId) ? String(req.query.room_id || req.query.roomId) : "";
    const data = await annualRankingService.getAnnualRanking(year, roomId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Errore nel calcolo classifica annuale:", error);
    res.status(500).json({ success: false, message: error.message || "Errore nel calcolo classifica annuale" });
  }
};

module.exports = {
  getAnnualRanking,
};
