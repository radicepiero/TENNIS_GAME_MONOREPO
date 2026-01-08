const db = require("../models");
const playersService = require("./playersService");
const predictionService = require("./predictionService");

const getSuperuserId = async () => {
  let superuserId = process.env.SUPERUSER;
  if (superuserId) return superuserId;
  const superUser = await db.User.findOne({ where: { level: "super" } });
  return superUser ? superUser.uuid : null;
};

const computeMatchWinnerId = (match) => {
  if (!match) return null;
  if (match.p1Wins) return match.player1Id;
  if (match.p2Wins) return match.player2Id;
  return null;
};

const computeChampionId = (matches) => {
  const finalMatch = (matches || []).find((m) => m && Number(m.round) === 1);
  if (!finalMatch) return null;
  return computeMatchWinnerId(finalMatch);
};

const didPlayRound = (playerId, round, matches) => {
  return Boolean(
    (matches || []).find(
      (x) =>
        Number(x.round) === Number(round) &&
        (Number(x.player1Id) === Number(playerId) || Number(x.player2Id) === Number(playerId))
    )
  );
};

const normalizeYmd = (v) => {
  if (!v) return null;
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const buildPointFunctions = async (tournamentId) => {
  const scriptsRes = await db.Tournament.findByPk(tournamentId, {
    include: [{ model: db.Script, required: false }],
  });
  const scripts = (scriptsRes && scriptsRes.Scripts) || [];
  let punteggioWinner = null;
  let punteggioSemifinalist = null;
  try {
    for (const s of scripts) {
      if (!s || !s.script) continue;
      const res = new Function(
        `"use strict";\n${s.script}\nreturn {\n  w: (typeof punteggioWinner === 'function') ? punteggioWinner : null,\n  sf: (typeof punteggioSemifinalist === 'function') ? punteggioSemifinalist : null\n};`
      )();
      if (!punteggioWinner && res && typeof res.w === "function") punteggioWinner = res.w;
      if (!punteggioSemifinalist && res && typeof res.sf === "function") punteggioSemifinalist = res.sf;
      if (punteggioWinner && punteggioSemifinalist) break;
    }
    return { punteggioWinner, punteggioSemifinalist };
  } catch (e) {
    throw new Error(`Errore esecuzione scripts punteggio torneo ${tournamentId}: ${e.message || e}`);
  }
};

const computePlayerPointsById = async (tournament) => {
  const rankingDate = normalizeYmd(tournament && tournament.ranking_date);
  const players = await playersService.readPlayers({ rankingDate });
  const { punteggioWinner, punteggioSemifinalist } = await buildPointFunctions(tournament.id);

  const playerPointsById = new Map();
  (players || []).forEach((p) => {
    const r = p && p.Rankings && p.Rankings[0] ? Number(p.Rankings[0].ranking) : NaN;
    const ranking = Number.isFinite(r) ? r : null;
    const puntiWinner = punteggioWinner ? Number(punteggioWinner(ranking)) || 0 : 0;
    const puntiSemifinalist = punteggioSemifinalist ? Number(punteggioSemifinalist(ranking)) || 0 : 0;

    playerPointsById.set(String(p.id), {
      puntiWinner,
      puntiSemifinalist,
    });
  });

  return playerPointsById;
};

const getAnnualRanking = async (year) => {
  const y = Number(year);
  if (!Number.isFinite(y)) {
    throw new Error("year non valido");
  }

  const tournaments = await db.Tournament.findAll({
    order: [["datafine", "ASC"]],
  });

  const tournamentsInYear = (tournaments || []).filter((t) => {
    if (t && String(t.status) === "excluded") return false;
    const df = t && t.datafine ? new Date(t.datafine) : null;
    if (!df || Number.isNaN(df.getTime())) return false;
    return df.getUTCFullYear() === y;
  });

  const superuserId = await getSuperuserId();

  const usersByUuid = new Map();
  const pointsByTournamentUser = new Map();

  for (const tournament of tournamentsInYear) {
    const tId = String(tournament.id);

    const predictions = await predictionService.readPredictionsTournament(tournament.id);

    const tree = superuserId
      ? await db.Tree.findOne({
          where: { tournament: String(tournament.id), ownerId: superuserId },
        })
      : null;

    const matches = tree
      ? await db.Match.findAll({ where: { treeId: tree.id } })
      : [];

    const championId = computeChampionId(matches);
    const playerPointsById = await computePlayerPointsById(tournament);

    const rowMap = new Map();

    (predictions || []).forEach((p) => {
      const userUuid = p && p.user_uuid ? String(p.user_uuid) : "";
      if (!userUuid) return;
      if (!usersByUuid.has(userUuid)) {
        usersByUuid.set(userUuid, {
          uuid: userUuid,
          soprannome: p.user_soprannome || userUuid,
          email: p.user_email || "",
        });
      }

      const rows = (p && p.rows) || [];
      const winnerRow = rows.find((r) => r && r.prediction === "winner");
      const semiRows = rows.filter((r) => r && r.prediction === "semifinalist");

      let total = 0;

      if (winnerRow && typeof winnerRow.player_id !== "undefined") {
        const playerId = String(winnerRow.player_id);
        const reachedSemifinal = didPlayRound(playerId, 2, matches);
        const isChampion = championId !== null && Number(championId) === Number(playerId);
        const pointsCfg = playerPointsById.get(playerId) || { puntiWinner: 0, puntiSemifinalist: 0 };

        if (isChampion) {
          total += Number(pointsCfg.puntiWinner) || 0;
        } else if (reachedSemifinal && championId !== null) {
          total += Number(pointsCfg.puntiSemifinalist) || 0;
        }
      }

      semiRows.forEach((r) => {
        if (!r || typeof r.player_id === "undefined") return;
        const playerId = String(r.player_id);
        const reachedSemifinal = didPlayRound(playerId, 2, matches);
        if (!reachedSemifinal) return;
        const pointsCfg = playerPointsById.get(playerId) || { puntiSemifinalist: 0 };
        total += Number(pointsCfg.puntiSemifinalist) || 0;
      });

      rowMap.set(userUuid, total);
    });

    pointsByTournamentUser.set(tId, rowMap);
  }

  const users = Array.from(usersByUuid.values()).sort((a, b) =>
    String(a.soprannome || "").localeCompare(String(b.soprannome || ""), "it")
  );

  const tournamentRows = tournamentsInYear.map((t) => ({
    id: String(t.id),
    name: t.name,
    datafine: t.datafine,
    status: t.status,
  }));

  const totals = {};
  users.forEach((u) => {
    totals[u.uuid] = 0;
  });

  const rowMax = {};

  tournamentRows.forEach((t) => {
    const map = pointsByTournamentUser.get(String(t.id)) || new Map();
    let max = 0;
    users.forEach((u) => {
      const v = Number(map.get(u.uuid)) || 0;
      totals[u.uuid] = (Number(totals[u.uuid]) || 0) + v;
      if (v > max) max = v;
    });
    rowMax[String(t.id)] = max;
  });

  return {
    year: y,
    users,
    tournaments: tournamentRows,
    points: tournamentRows.reduce((acc, t) => {
      const map = pointsByTournamentUser.get(String(t.id)) || new Map();
      acc[String(t.id)] = {};
      users.forEach((u) => {
        acc[String(t.id)][u.uuid] = Number(map.get(u.uuid)) || 0;
      });
      return acc;
    }, {}),
    totals,
    rowMax,
  };
};

module.exports = {
  getAnnualRanking,
};
