const db = require("../models");

function toTime(v) {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : null;
}

function tournamentSortTime(t) {
  return toTime(t.dataopen) ?? toTime(t.datainizio) ?? toTime(t.datafine) ?? 0;
}

function normalizeStatus(s) {
  return s ? String(s).toLowerCase() : "";
}

async function getFriendDashboard(userUuid) {
  if (!userUuid) throw new Error("userUuid mancante");

  const tournaments = await db.Tournament.findAll({
    order: [["datafine", "DESC"]],
  });

  const visibleTournaments = (tournaments || []).filter(
    (t) => normalizeStatus(t.status) !== "excluded"
  );

  const currentTournament =
    visibleTournaments.find((t) => normalizeStatus(t.status) === "in-progress") || null;

  const nextTournaments = visibleTournaments
    .filter((t) => {
      const st = normalizeStatus(t.status);
      return st === "open" || st === "upcoming";
    })
    .sort((a, b) => (tournamentSortTime(a) || 0) - (tournamentSortTime(b) || 0))
    .slice(0, 3);

  const recentTournaments = visibleTournaments
    .filter((t) => normalizeStatus(t.status) === "completed")
    .sort((a, b) => (toTime(b.datafine) || 0) - (toTime(a.datafine) || 0))
    .slice(0, 8);

  const tournamentIds = Array.from(
    new Set(
      [
        ...(currentTournament ? [currentTournament.id] : []),
        ...nextTournaments.map((t) => t.id),
        ...recentTournaments.map((t) => t.id),
      ].filter(Boolean)
    )
  );

  const [trees, predictions] = await Promise.all([
    db.Tree.findAll({
      where: {
        ownerId: userUuid,
        ...(tournamentIds.length ? { tournament: tournamentIds.map(String) } : {}),
      },
    }),
    db.Prediction.findAll({
      where: {
        user_uuid: userUuid,
        ...(tournamentIds.length ? { tournament_id: tournamentIds } : {}),
      },
    }),
  ]);

  const hasTreeByTournament = new Map();
  for (const tr of trees || []) {
    const tid = tr && tr.tournament ? String(tr.tournament) : null;
    if (tid) hasTreeByTournament.set(tid, true);
  }

  const hasPredictionByTournament = new Map();
  for (const pr of predictions || []) {
    const tid = pr && pr.tournament_id ? String(pr.tournament_id) : null;
    if (tid) hasPredictionByTournament.set(tid, true);
  }

  const buildTournamentPreview = (t) => {
    if (!t) return null;
    const tid = String(t.id);
    return {
      id: t.id,
      name: t.name,
      status: t.status,
      dataopen: t.dataopen,
      datainizio: t.datainizio,
      datafine: t.datafine,
      roundopen: t.roundopen,
      hasTree: Boolean(hasTreeByTournament.get(tid)),
      hasPrediction: Boolean(hasPredictionByTournament.get(tid)),
    };
  };

  const year = new Date().getFullYear();

  return {
    currentYear: year,
    currentTournament: buildTournamentPreview(currentTournament),
    nextTournaments: nextTournaments.map(buildTournamentPreview),
    recentTournaments: recentTournaments.map(buildTournamentPreview),
  };
}

module.exports = {
  getFriendDashboard,
};
