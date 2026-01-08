const db = require("../models");
const crypto = require("crypto");

const getSuperuserId = async () => {
  let superuserId = process.env.SUPERUSER;
  if (superuserId) return superuserId;
  const superUser = await db.User.findOne({ where: { level: "super" } });
  return superUser ? superUser.uuid : null;
};

const normalizeTournamentStatus = (t) => (t && t.status ? String(t.status).toLowerCase() : "");

const cloneSuperuserTreeToUser = async ({ tournamentId, user }) => {
  if (!user || !user.uuid) {
    const err = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }

  const tId = Number(tournamentId);
  if (!Number.isFinite(tId)) {
    const err = new Error("tournamentId non valido");
    err.statusCode = 400;
    throw err;
  }

  const tournament = await db.Tournament.findByPk(tId);
  if (!tournament) {
    const err = new Error("Torneo non trovato");
    err.statusCode = 404;
    throw err;
  }

  const status = normalizeTournamentStatus(tournament);
  if (status !== "open") {
    const err = new Error("Operazione consentita solo con torneo in stato open");
    err.statusCode = 400;
    throw err;
  }

  const existing = await db.Tree.findOne({
    where: {
      tournament: String(tId),
      ownerId: String(user.uuid),
    },
  });
  if (existing) {
    const err = new Error("Esiste già un albero per questo torneo");
    err.statusCode = 409;
    throw err;
  }

  const superuserId = await getSuperuserId();
  if (!superuserId) {
    const err = new Error("Superuser non trovato");
    err.statusCode = 500;
    throw err;
  }

  const superTree = await db.Tree.findOne({
    where: {
      tournament: String(tId),
      ownerId: String(superuserId),
    },
    include: [{ model: db.Match, as: "Matches", required: false }],
  });

  if (!superTree) {
    const err = new Error("Albero superuser non disponibile per questo torneo");
    err.statusCode = 404;
    throw err;
  }

  const superMatches = (superTree.Matches || []).map((m) => m.dataValues || m);

  const newTreeId = crypto.randomUUID();

  const matchIdMap = new Map();
  superMatches.forEach((m) => {
    const newMatchId = crypto.randomUUID();
    matchIdMap.set(String(m.uuid), newMatchId);
  });

  const matchesToCreate = superMatches.map((m) => {
    const newUuid = matchIdMap.get(String(m.uuid));
    const newFather = m.fatherId ? matchIdMap.get(String(m.fatherId)) || null : null;
    return {
      uuid: newUuid,
      treeId: newTreeId,
      round: m.round,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      fatherId: newFather,
      p1Wins: false,
      p2Wins: false,
      date: m.date || null,
    };
  });

  const transaction = await db.sequelize.transaction();
  try {
    const tree = await db.Tree.create(
      {
        id: newTreeId,
        name: `Pronostico ${user.soprannome || user.email || user.uuid}`,
        tournament: String(tId),
        ownerId: String(user.uuid),
        roundMax: superTree.roundMax,
      },
      { transaction }
    );

    await db.Match.bulkCreate(matchesToCreate, { transaction });

    await transaction.commit();

    const created = await db.Tree.findByPk(tree.id, {
      include: [{ model: db.Match, as: "Matches", required: false }],
    });

    return created;
  } catch (e) {
    await transaction.rollback();
    throw e;
  }
};

module.exports = {
  cloneSuperuserTreeToUser,
};
