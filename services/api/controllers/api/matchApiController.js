// controllers/matchController.js
const matchService = require("../../services/matchService");

exports.createMatch = async (req, res) => {
  try {
    const match = await matchService.createMatch(req.body);
    res.status(201).json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMatchById = async (req, res) => {
  try {
    const match = await matchService.getMatchById(req.params.uuid);
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMatchesByTreeId = async (req, res) => {
  try {
    const matches = await matchService.getMatchesByTreeId(req.params.treeId);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMatch = async (req, res) => {
  try {
    const match = await matchService.updateMatch(req.params.uuid, req.body);
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMultipleMatches = async (req, res) => {
  try {
    const matches = await matchService.updateMultipleMatches(req.body);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMatch = async (req, res) => {
  try {
    await matchService.deleteMatch(req.params.uuid);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
