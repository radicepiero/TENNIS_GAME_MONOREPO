const db = require("../models");

const DEFAULT_ROOM_NAME = "Arena";

const resolveRoomIdOrDefault = async (roomId) => {
  if (roomId) return Number(roomId);
  const [rows] = await db.sequelize.query(
    "SELECT id FROM public.rooms WHERE name = :name LIMIT 1;",
    { replacements: { name: DEFAULT_ROOM_NAME } }
  );
  const id = rows && rows[0] && rows[0].id ? Number(rows[0].id) : null;
  return id;
};

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

const buildPointFunctionsFromScripts = (scripts, tournamentId) => {
  const list = Array.isArray(scripts) ? scripts : [];
  let punteggioWinner = null;
  let punteggioSemifinalist = null;
  try {
    for (const s of list) {
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
    throw new Error(
      `Errore esecuzione scripts punteggio torneo ${tournamentId}: ${e.message || e}`
    );
  }
};

async function buildMyPlayers(userUuid, roomId) {
  const rid = await resolveRoomIdOrDefault(roomId);
  const predictions = await db.Prediction.findAll({
    where: { user_uuid: userUuid, ...(rid ? { room_id: rid } : {}) },
    include: [
      {
        model: db.PredictionRow,
        as: "prediction_id",
        required: false,
        attributes: ["player_id", "prediction"],
      },
      {
        model: db.Tournament,
        required: false,
        attributes: ["id", "name", "nickname", "datafine", "ranking_date"],
      },
    ],
  });

  const tournamentIds = Array.from(
    new Set(
      (predictions || [])
        .map((p) => (p && p.tournament_id ? Number(p.tournament_id) : null))
        .filter((x) => x !== null)
    )
  );

  if (!tournamentIds.length) return [];

  const superuserId = await getSuperuserId();

  const [tournaments, superTrees, maxRankingDate] = await Promise.all([
    db.Tournament.findAll({
      where: { id: tournamentIds },
      include: [{ model: db.Script, required: false }],
    }),
    superuserId
      ? db.Tree.findAll({
          where: {
            ownerId: String(superuserId),
            [db.Sequelize.Op.or]: [
              { tournament_id: tournamentIds },
              { tournament: tournamentIds.map(String) },
            ],
          },
        })
      : [],
    db.Ranking.max("date"),
  ]);

  const tournamentById = new Map();
  (tournaments || []).forEach((t) => {
    if (!t || typeof t.id === "undefined" || t.id === null) return;
    tournamentById.set(String(t.id), t);
  });

  const superTreeByTournament = new Map();
  (superTrees || []).forEach((tr) => {
    const tid = tr && (tr.tournament_id || tr.tournament) ? String(tr.tournament_id || tr.tournament) : "";
    if (tid && !superTreeByTournament.has(tid)) superTreeByTournament.set(tid, tr);
  });

  const matchesByTournament = new Map();
  const treeIds = Array.from(
    new Set(
      Array.from(superTreeByTournament.values())
        .map((t) => (t && t.id ? String(t.id) : ""))
        .filter(Boolean)
    )
  );
  if (treeIds.length) {
    const matches = await db.Match.findAll({ where: { treeId: treeIds } });
    const matchesByTreeId = new Map();
    (matches || []).forEach((m) => {
      const id = m && m.treeId ? String(m.treeId) : "";
      if (!id) return;
      if (!matchesByTreeId.has(id)) matchesByTreeId.set(id, []);
      matchesByTreeId.get(id).push(m);
    });
    superTreeByTournament.forEach((tr, tid) => {
      const id = tr && tr.id ? String(tr.id) : "";
      matchesByTournament.set(String(tid), matchesByTreeId.get(id) || []);
    });
  }

  const playerIdsByTournament = new Map();
  (predictions || []).forEach((p) => {
    const tid = p && p.tournament_id ? String(p.tournament_id) : "";
    if (!tid) return;
    const rows = (p && p.prediction_id) || [];
    rows.forEach((r) => {
      if (!r || typeof r.player_id === "undefined" || r.player_id === null) return;
      if (!playerIdsByTournament.has(tid)) playerIdsByTournament.set(tid, new Set());
      playerIdsByTournament.get(tid).add(Number(r.player_id));
    });
  });

  const playerInfoById = new Map();
  const pointsCfgByTournamentPlayer = new Map();

  for (const [tid, set] of playerIdsByTournament.entries()) {
    const tournament = tournamentById.get(String(tid));
    if (!tournament) continue;

    const rankingDate = normalizeYmd(tournament.ranking_date) || normalizeYmd(maxRankingDate);
    const scripts = (tournament && tournament.Scripts) || [];
    const { punteggioWinner, punteggioSemifinalist } = buildPointFunctionsFromScripts(scripts, tid);

    const ids = Array.from(set.values()).filter((x) => Number.isFinite(Number(x)));
    if (!ids.length) continue;

    const players = await db.Player.findAll({
      where: { id: ids },
      include: [
        {
          model: db.Ranking,
          required: false,
          attributes: ["date", "ranking"],
          ...(rankingDate ? { where: { date: rankingDate } } : {}),
        },
      ],
    });

    const cfgByPlayer = new Map();
    (players || []).forEach((p) => {
      if (!p || typeof p.id === "undefined" || p.id === null) return;
      const rid = String(p.id);
      const r = p.Rankings && p.Rankings[0] ? Number(p.Rankings[0].ranking) : NaN;
      const ranking = Number.isFinite(r) ? r : null;
      const puntiWinner = punteggioWinner ? Number(punteggioWinner(ranking)) || 0 : 0;
      const puntiSemifinalist = punteggioSemifinalist ? Number(punteggioSemifinalist(ranking)) || 0 : 0;

      cfgByPlayer.set(rid, { puntiWinner, puntiSemifinalist, ranking });

      if (!playerInfoById.has(rid)) {
        playerInfoById.set(rid, {
          id: p.id,
          name: p.name,
          country: p.country,
          image_src: p.image_src,
          image_alt: p.image_alt,
        });
      }
    });

    pointsCfgByTournamentPlayer.set(String(tid), cfgByPlayer);
  }

  const byPlayer = new Map();

  (predictions || []).forEach((p) => {
    const tid = p && p.tournament_id ? String(p.tournament_id) : "";
    if (!tid) return;
    const tournament = p && p.Tournament ? p.Tournament : tournamentById.get(tid);
    const rows = (p && p.prediction_id) || [];

    const matches = matchesByTournament.get(tid) || [];
    const championId = computeChampionId(matches);

    rows.forEach((r) => {
      if (!r || typeof r.player_id === "undefined" || r.player_id === null) return;
      const pid = String(r.player_id);
      const role = r.prediction ? String(r.prediction) : "";
      const cfgMap = pointsCfgByTournamentPlayer.get(tid) || new Map();
      const cfg = cfgMap.get(pid) || { puntiWinner: 0, puntiSemifinalist: 0, ranking: null };

      const predictedPoints = role === "winner" ? Number(cfg.puntiWinner) || 0 : Number(cfg.puntiSemifinalist) || 0;

      let realizedPoints = 0;
      const reachedSemifinal = didPlayRound(pid, 2, matches);
      const hasOfficial = matches && matches.length && championId !== null;

      if (!hasOfficial) {
        realizedPoints = null;
      } else if (role === "winner") {
        const isChampion = Number(championId) === Number(pid);
        if (isChampion) realizedPoints = Number(cfg.puntiWinner) || 0;
        else if (reachedSemifinal) realizedPoints = Number(cfg.puntiSemifinalist) || 0;
        else realizedPoints = 0;
      } else {
        realizedPoints = reachedSemifinal ? Number(cfg.puntiSemifinalist) || 0 : 0;
      }

      if (!byPlayer.has(pid)) {
        byPlayer.set(pid, {
          player: playerInfoById.get(pid) || { id: Number(pid), name: pid },
          picks: [],
          _lastSort: 0,
          _cardCfg: { puntiWinner: 0, puntiSemifinalist: 0, ranking: null },
        });
      }

      const entry = {
        tournament_id: tournament && tournament.id ? String(tournament.id) : tid,
        tournament_nickname: (tournament && (tournament.nickname || tournament.name)) || tid,
        tournament_datafine: tournament && tournament.datafine ? tournament.datafine : null,
        role,
        predictedPoints,
        realizedPoints,
      };

      const rec = byPlayer.get(pid);
      rec.picks.push(entry);

      const tf = tournament && tournament.datafine ? new Date(tournament.datafine).getTime() : 0;
      if (tf >= (rec._lastSort || 0)) {
        rec._lastSort = tf;
        rec._cardCfg = cfg;
      }
    });
  });

  const out = Array.from(byPlayer.entries())
    .map(([pid, v]) => {
      const p = v.player || {};
      const cfg = v._cardCfg || {};
      return {
        player: {
          ...p,
          Rankings: cfg.ranking !== null && typeof cfg.ranking !== "undefined" ? [{ ranking: cfg.ranking }] : [],
          puntiWinner: Number(cfg.puntiWinner) || 0,
          puntiSemifinalist: Number(cfg.puntiSemifinalist) || 0,
        },
        tournaments: (v.picks || []).sort((a, b) => {
          const da = a && a.tournament_datafine ? new Date(a.tournament_datafine).getTime() : 0;
          const db = b && b.tournament_datafine ? new Date(b.tournament_datafine).getTime() : 0;
          return db - da;
        }),
      };
    })
    .sort((a, b) => String(a.player && a.player.name ? a.player.name : "").localeCompare(String(b.player && b.player.name ? b.player.name : ""), "it"));

  return out;
}

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

async function getFriendDashboard(userUuid, roomId) {
  if (!userUuid) throw new Error("userUuid mancante");

  const rid = await resolveRoomIdOrDefault(roomId);

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

  const superuserId = await getSuperuserId();

  const [trees, predictions, superTrees] = await Promise.all([
    db.Tree.findAll({
      where: {
        ownerId: userUuid,
        ...(tournamentIds.length ? { tournament: tournamentIds.map(String) } : {}),
      },
    }),
    db.Prediction.findAll({
      where: {
        user_uuid: userUuid,
        ...(rid ? { room_id: rid } : {}),
        ...(tournamentIds.length ? { tournament_id: tournamentIds } : {}),
      },
    }),
    superuserId
      ? db.Tree.findAll({
          where: {
            ownerId: String(superuserId),
            ...(tournamentIds.length
              ? {
                  [db.Sequelize.Op.or]: [
                    { tournament_id: tournamentIds },
                    { tournament: tournamentIds.map(String) },
                  ],
                }
              : {}),
          },
        })
      : [],
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

  const hasSuperTreeByTournament = new Map();
  for (const tr of superTrees || []) {
    const tid = tr && (tr.tournament_id || tr.tournament) ? String(tr.tournament_id || tr.tournament) : null;
    if (tid) hasSuperTreeByTournament.set(tid, true);
  }

  const buildTournamentPreview = (t) => {
    if (!t) return null;
    const tid = String(t.id);
    return {
      id: t.id,
      name: t.name,
      nickname: t.nickname,
      category: t.category,
      image: t.image,
      surface: t.surface,
      location: t.location,
      country: t.country,
      status: t.status,
      dataopen: t.dataopen,
      datainizio: t.datainizio,
      datafine: t.datafine,
      roundopen: t.roundopen,
      hasTree: Boolean(hasTreeByTournament.get(tid)),
      hasPrediction: Boolean(hasPredictionByTournament.get(tid)),
      hasSuperTree: Boolean(hasSuperTreeByTournament.get(tid)),
    };
  };

  const year = new Date().getFullYear();

  const myPlayers = await buildMyPlayers(userUuid, rid);

  return {
    currentYear: year,
    currentTournament: buildTournamentPreview(currentTournament),
    nextTournaments: nextTournaments.map(buildTournamentPreview),
    recentTournaments: recentTournaments.map(buildTournamentPreview),
    myPlayers,
  };
}

module.exports = {
  getFriendDashboard,
};
