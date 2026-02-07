const db = require("../models");
const { Tree, Match } = db;

const getSuperuserId = async () => {
  let superuserId = process.env.SUPERUSER;
  if (superuserId) return superuserId;
  const superUser = await db.User.findOne({ where: { level: "super" } });
  return superUser ? superUser.uuid : null;
};

// CREATE
async function createTree(treeData) {
  const transaction = await Tree.sequelize.transaction();

  try {
    const tournamentIdNum =
      typeof treeData.tournamentId === "number"
        ? treeData.tournamentId
        : Number(treeData.tournamentId);

    const treeToCreate = {
      id: treeData.uuid,
      name: treeData.name,
      tournament_id: Number.isFinite(tournamentIdNum) ? tournamentIdNum : null,
      tournament: treeData.tournamentId != null ? String(treeData.tournamentId) : null,
      ownerId: treeData.ownerId,
      roundMax: treeData.roundMax,
    };

    const superuserId = await getSuperuserId();
    if (superuserId && String(treeToCreate.ownerId) !== String(superuserId)) {
      const tId = treeToCreate.tournament_id;
      if (!Number.isFinite(tId)) {
        const err = new Error("tournamentId non valido");
        err.statusCode = 400;
        throw err;
      }

      const superTree = await Tree.findOne({
        where: {
          ownerId: String(superuserId),
          [db.Sequelize.Op.or]: [{ tournament_id: tId }, { tournament: String(tId) }],
        },
        transaction,
      });

      if (!superTree) {
        const err = new Error(
          "Impossibile creare l'albero: non esiste ancora l'albero del superuser per questo torneo"
        );
        err.statusCode = 404;
        throw err;
      }
    }

    const tree = await Tree.create(treeToCreate, { transaction });

    const matchesToCreate = treeData.matches.map((match) => ({
      uuid: match.uuid,
      treeId: match.treeId,
      round: match.round,
      player1Id: match.player1,
      player2Id: match.player2,
      fatherId: match.fatherId,
      p1Wins: match.p1Wins,
      p2Wins: match.p2Wins,
      date: match.date,
    }));

    await Match.bulkCreate(matchesToCreate, { transaction });
    await transaction.commit();

    const result = await getTree({ treeId: tree.id });
    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// READ
async function getTree(options = {}) {
  const { treeId, ownerId, tournamentId, includeMatches } = options;

  const where = {};
  if (treeId) where.id = treeId;
  if (ownerId) where.ownerId = ownerId;
  if (tournamentId) {
    const tIdNum = typeof tournamentId === "number" ? tournamentId : Number(tournamentId);
    if (Number.isFinite(tIdNum)) {
      where.tournament_id = tIdNum;
    } else {
      where.tournament = String(tournamentId);
    }
  }

  // Converti includeMatches in booleano
  const shouldIncludeMatches =
    typeof includeMatches === "string"
      ? includeMatches.toLowerCase() !== "false"
      : Boolean(includeMatches);

  const include = shouldIncludeMatches
    ? [
        {
          model: Match,
          as: "Matches",
        },
      ]
    : [];

  return await Tree.findAll({
    include,
    where,
  });
}

// UPDATE
async function updateTree(id, treeData) {
  const transaction = await Tree.sequelize.transaction();

  try {
    const tournamentIdNum =
      typeof treeData.tournamentId === "number"
        ? treeData.tournamentId
        : Number(treeData.tournamentId);

    // Aggiorna il tree
    const [updated] = await Tree.update(
      {
        name: treeData.name,
        tournament_id: Number.isFinite(tournamentIdNum) ? tournamentIdNum : null,
        tournament: treeData.tournamentId != null ? String(treeData.tournamentId) : null,
        roundMax: treeData.roundMax,
      },
      {
        where: { id },
        transaction,
      }
    );

    if (!updated) {
      throw new Error("Tree not found");
    }

    // Aggiorna i matches (implementazione base)
    await Match.destroy({ where: { treeId: id }, transaction });

    const matchesToCreate = treeData.matches.map((match) => ({
      uuid: match.uuid,
      treeId: id, // Forza l'ID del tree
      round: match.round,
      player1Id: match.player1,
      player2Id: match.player2,
      fatherId: match.fatherId,
      p1Wins: match.p1Wins,
      p2Wins: match.p2Wins,
      date: match.date,
    }));

    await Match.bulkCreate(matchesToCreate, { transaction });
    await transaction.commit();

    const result = await getTree({ treeId: id });
    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// DELETE
async function deleteTree(id) {
  const transaction = await Tree.sequelize.transaction();

  try {
    await Match.destroy({ where: { treeId: id }, transaction });

    const deleted = await Tree.destroy({
      where: { id },
      transaction,
    });

    if (!deleted) {
      throw new Error("Tree not found");
    }

    await transaction.commit();
    return { id };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
module.exports = {
  createTree,
  getTree,
  updateTree,
  deleteTree,
};
