// services/matchService.js
const { Match } = require('../models');

const createMatch = async (matchData) => {
  return await Match.create(matchData);
};

const getMatchById = async (uuid) => {
  return await Match.findByPk(uuid);
};

const getMatchesByTreeId = async (treeId) => {
  return await Match.findAll({
    where: { treeId },
    order: [['round', 'ASC']]
  });
};

const updateMatch = async (uuid, updates) => {
  const match = await Match.findByPk(uuid);
  if (!match) throw new Error('Match not found');
  return await match.update(updates);
};

const updateMultipleMatches = async (updatesArray) => {
  const results = await Promise.all(updatesArray.map(async (update) => {
    const match = await Match.findByPk(update.uuid);
    if (!match) throw new Error(`Match not found: ${update.uuid}`);
    return await match.update(update);
  }));
  return results;
};

const deleteMatch = async (uuid) => {
  const match = await Match.findByPk(uuid);
  if (!match) throw new Error('Match not found');
  await match.destroy();
  return true;
};

module.exports = {
  createMatch,
  getMatchById,
  getMatchesByTreeId,
  updateMatch,
  updateMultipleMatches,
  deleteMatch
};
