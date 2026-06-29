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
      childIndex: match.childIndex ?? null,
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
    order: shouldIncludeMatches
      ? [
          [{ model: Match, as: "Matches" }, "round", "ASC"],
          [{ model: Match, as: "Matches" }, "fatherId", "ASC"],
          [{ model: Match, as: "Matches" }, "childIndex", "ASC"],
          [{ model: Match, as: "Matches" }, "uuid", "ASC"],
        ]
      : undefined,
  });
}

// UPDATE
async function updateTree(id, treeData) {
  const transaction = await Tree.sequelize.transaction();

  try {
    const updatePayload = {};
    if (treeData && treeData.name != null) updatePayload.name = treeData.name;
    if (treeData && treeData.roundMax != null) updatePayload.roundMax = treeData.roundMax;
    if (treeData && treeData.tournamentId != null) {
      const tournamentIdNum =
        typeof treeData.tournamentId === "number"
          ? treeData.tournamentId
          : Number(treeData.tournamentId);
      updatePayload.tournament_id = Number.isFinite(tournamentIdNum) ? tournamentIdNum : null;
      updatePayload.tournament = String(treeData.tournamentId);
    }

    const [updated] =
      Object.keys(updatePayload).length === 0
        ? [1]
        : await Tree.update(updatePayload, {
            where: { id },
            transaction,
          });

    if (!updated) {
      throw new Error("Tree not found");
    }

    const matches = (treeData && treeData.matches) || [];
    if (!Array.isArray(matches)) {
      throw new Error("matches non valido");
    }

    // Se arrivano solo uuid + p1Wins/p2Wins (mobile), NON dobbiamo ricreare le righe,
    // altrimenti perdiamo player1Id/player2Id/round/fatherId.
    const isPartialWinsOnly =
      matches.length > 0 &&
      matches.every(
        (m) =>
          m &&
          typeof m === "object" &&
          m.uuid &&
          (typeof m.p1Wins === "boolean" || typeof m.p2Wins === "boolean") &&
          m.round == null &&
          m.player1 == null &&
          m.player2 == null &&
          m.player1Id == null &&
          m.player2Id == null
      );

    if (isPartialWinsOnly) {
      for (const m of matches) {
        await Match.update(
          {
            p1Wins: Boolean(m.p1Wins),
            p2Wins: Boolean(m.p2Wins),
          },
          { where: { uuid: String(m.uuid), treeId: id }, transaction }
        );
      }
    } else {
      // Aggiornamento completo (web): replace totale matches.
      await Match.destroy({ where: { treeId: id }, transaction });

      const matchesToCreate = matches.map((match) => ({
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
    }
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
