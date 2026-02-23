const roomService = require("../../services/roomService");

const getMyRooms = async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const rooms = await roomService.listRoomsForUser(user_uuid);
    return res.status(200).json({ success: true, data: rooms });
  } catch (e) {
    console.error("Errore getMyRooms:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
};

const getMyInvitations = async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const rows = await roomService.listMyInvitations(user_uuid);
    return res.status(200).json({ success: true, data: rows });
  } catch (e) {
    console.error("Errore getMyInvitations:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
};

const searchRoomInvitees = async (req, res) => {
  try {
    const room_id = req.params && req.params.id ? Number(req.params.id) : null;
    if (!room_id) {
      return res.status(400).json({ success: false, message: "room_id mancante" });
    }

    const q = (req.query && req.query.q) || "";
    const rows = await roomService.searchInvitees({ q, limit: 20, excludeRoomId: room_id });
    return res.status(200).json({ success: true, data: rows });
  } catch (e) {
    console.error("Errore searchRoomInvitees:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
};

const postRoomInvitation = async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const room_id = req.params && req.params.id ? Number(req.params.id) : null;
    if (!room_id) {
      return res.status(400).json({ success: false, message: "room_id mancante" });
    }

    const invitee_uuid = req.body && (req.body.user_uuid || req.body.userUuid) ? String(req.body.user_uuid || req.body.userUuid) : "";
    if (!invitee_uuid) {
      return res.status(400).json({ success: false, message: "user_uuid mancante" });
    }

    const row = await roomService.inviteUserToRoom({ room_id, inviter_uuid: user_uuid, invitee_uuid });
    return res.status(200).json({ success: true, data: row });
  } catch (e) {
    const msg = e && e.message ? String(e.message) : "Errore";
    return res.status(400).json({ success: false, message: msg });
  }
};

const postAcceptInvitation = async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const room_id = req.params && req.params.id ? Number(req.params.id) : null;
    if (!room_id) {
      return res.status(400).json({ success: false, message: "room_id mancante" });
    }

    const row = await roomService.respondToInvitation({ room_id, user_uuid, accept: true });
    return res.status(200).json({ success: true, data: row });
  } catch (e) {
    const msg = e && e.message ? String(e.message) : "Errore";
    return res.status(400).json({ success: false, message: msg });
  }
};

const postDeclineInvitation = async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const room_id = req.params && req.params.id ? Number(req.params.id) : null;
    if (!room_id) {
      return res.status(400).json({ success: false, message: "room_id mancante" });
    }

    const row = await roomService.respondToInvitation({ room_id, user_uuid, accept: false });
    return res.status(200).json({ success: true, data: row });
  } catch (e) {
    const msg = e && e.message ? String(e.message) : "Errore";
    return res.status(400).json({ success: false, message: msg });
  }
};

const postRoom = async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, short_description, long_description } = req.body || {};
    const cleanName = (name || "").trim();
    if (!cleanName) {
      return res.status(400).json({ success: false, message: "name mancante" });
    }

    if (String(cleanName).trim().toLowerCase() === "arena") {
      return res.status(400).json({ success: false, message: "Nome stanza riservato" });
    }

    const room = await roomService.createRoom({
      name: cleanName,
      short_description,
      long_description,
      creator_uuid: user_uuid,
    });

    return res.status(200).json({ success: true, data: room });
  } catch (e) {
    console.error("Errore postRoom:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
};

const getRoomMembers = async (req, res) => {
  try {
    const room_id = req.params && req.params.id ? Number(req.params.id) : null;
    if (!room_id) {
      return res.status(400).json({ success: false, message: "room_id mancante" });
    }

    const rows = await roomService.listRoomMembers(room_id);
    return res.status(200).json({ success: true, data: rows });
  } catch (e) {
    console.error("Errore getRoomMembers:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
};

const getRoomTournaments = async (req, res) => {
  try {
    const room_id = req.params && req.params.id ? Number(req.params.id) : null;
    if (!room_id) {
      return res.status(400).json({ success: false, message: "room_id mancante" });
    }

    const rows = await roomService.listRoomTournaments(room_id);
    return res.status(200).json({ success: true, data: rows });
  } catch (e) {
    console.error("Errore getRoomTournaments:", e);
    return res.status(500).json({ success: false, message: "Errore interno del server" });
  }
};

module.exports = {
  getMyRooms,
  postRoom,
  getRoomMembers,
  getRoomTournaments,
  getMyInvitations,
  searchRoomInvitees,
  postRoomInvitation,
  postAcceptInvitation,
  postDeclineInvitation,
};
