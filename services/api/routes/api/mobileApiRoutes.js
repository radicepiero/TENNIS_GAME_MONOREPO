const { Router } = require("express");

const db = require("../../models");
const tournamentService = require("../../services/tournamentService");
const predictionService = require("../../services/predictionService");
const treeService = require("../../services/treeService");
const friendDashboardService = require("../../services/friendDashboardService");
const annualRankingService = require("../../services/annualRankingService");
const roomService = require("../../services/roomService");
const crypto = require("crypto");

const router = Router();

const { DEFAULT_ROOM_NAME } = require("../../config/constants");

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

router.get("/tournaments/index", async (req, res) => {
  try {
    const tournaments = await db.Tournament.findAll({
      order: [["datafine", "ASC"]],
      raw: true,
    });

    const visible = (tournaments || []).filter((t) => {
      const st = t && t.status ? String(t.status).toLowerCase() : "";
      return st !== "excluded";
    });

    for (const t of visible) {
      if (t && t.name && (!t.nickname || !String(t.nickname).trim())) {
        t.nickname = t.name;
      }
    }

    const version = crypto
      .createHash("sha1")
      .update(
        JSON.stringify(
          visible.map((t) => [t.id, t.status, t.datafine, t.datainizio, t.nickname, t.surface_jsonb])
        )
      )
      .digest("hex");

    return res.status(200).json({
      success: true,
      data: {
        version,
        tournaments: visible,
      },
    });
  } catch (e) {
    console.error("Errore mobile tournaments index:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
});

router.get("/friend/home", async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const myRooms = await roomService.listRoomsForUser(user_uuid);

    const roomIdRaw = (req.query && (req.query.room_id || req.query.roomId)) || null;
    const room_id = await resolveRoomIdOrDefault(roomIdRaw);

    const dashboard = await friendDashboardService.getFriendDashboard(user_uuid, room_id);

    return res.status(200).json({
      success: true,
      data: {
        room_id: room_id || null,
        rooms: myRooms || [],
        dashboard,
      },
    });
  } catch (e) {
    console.error("Errore mobile friend home:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
});

router.get("/tournaments/:id/sviluppo", async (req, res) => {
  try {
    const tournamentId = req.params && req.params.id ? String(req.params.id) : "";
    if (!tournamentId) {
      return res.status(400).json({ success: false, message: "tournamentId mancante" });
    }

    const roomIdRaw = (req.query && (req.query.room_id || req.query.roomId)) || null;
    const room_id = await resolveRoomIdOrDefault(roomIdRaw);

    const [tournament, predictions, superuserId] = await Promise.all([
      tournamentService.getTournament(tournamentId),
      predictionService.readPredictionsTournament(tournamentId, room_id),
      getSuperuserId(),
    ]);

    if (!tournament) {
      return res.status(404).json({ success: false, message: "Torneo non trovato" });
    }

    let superuserTree = null;
    if (superuserId) {
      const trees = await treeService.getTree({
        tournamentId,
        ownerId: superuserId,
        includeMatches: true,
      });
      superuserTree = trees && trees.length ? trees[0] : null;
    }

    let tournamentRanking = null;
    try {
      const st = tournament && tournament.status ? String(tournament.status).toLowerCase() : "";
      if (st === "completed") {
        tournamentRanking = await annualRankingService.getTournamentRanking(tournamentId, room_id);
      }
    } catch (e) {
      tournamentRanking = null;
    }

    return res.status(200).json({
      success: true,
      data: {
        tournament,
        room_id: room_id || null,
        predictions: predictions || [],
        superuserTree,
        tournamentRanking,
      },
    });
  } catch (e) {
    console.error("Errore mobile sviluppo:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
});

router.get("/tournaments/:id/players", async (req, res) => {
  try {
    const tournamentId = req.params && req.params.id ? String(req.params.id) : "";
    if (!tournamentId) {
      return res.status(400).json({ success: false, message: "tournamentId mancante" });
    }

    const links = await tournamentService.getTournamentPlayers(parseInt(tournamentId, 10));
    const players = (links || [])
      .map((x) => (x && x.Player ? x.Player : null))
      .filter(Boolean)
      .map((p) => ({
        id: p.id,
        name: p.name,
        country: p.country || null,
        image_src: p.image_src || null,
        image_alt: p.image_alt || null,
      }));

    return res.status(200).json({
      success: true,
      data: {
        tournament_id: tournamentId,
        players,
      },
    });
  } catch (e) {
    console.error("Errore mobile tournament players:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
});

module.exports = router;
