const db = require("../models");

const Room = db.Room;
const RoomMember = db.RoomMember;
const RoomTournament = db.RoomTournament;
const User = db.User;

const { Op } = db.Sequelize;

async function assertRoomOwner({ room_id, user_uuid }) {
  const membership = await RoomMember.findOne({
    where: {
      room_id,
      user_uuid,
      status: "accepted",
      role: "owner",
    },
  });
  return Boolean(membership);
}

const listRoomsForUser = async (user_uuid) => {
  const memberships = await RoomMember.findAll({
    where: { user_uuid, status: "accepted" },
    include: [
      {
        model: Room,
        required: true,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["uuid", "email", "soprannome", "image_url"],
            required: false,
          },
        ],
      },
    ],
    order: [["room_id", "ASC"]],
  });

  return (memberships || []).map((m) => {
    const r = m.Room;
    return {
      id: r.id,
      name: r.name,
      short_description: r.short_description,
      long_description: r.long_description,
      created_by_user_uuid: r.created_by_user_uuid,
      creator: r.creator || null,
      membership: {
        role: m.role,
        status: m.status,
      },
    };
  });
};

const listMyInvitations = async (user_uuid) => {
  const rows = await RoomMember.findAll({
    where: { user_uuid, status: "pending" },
    include: [
      {
        model: Room,
        required: true,
      },
      {
        model: User,
        as: "inviter",
        attributes: ["uuid", "email", "soprannome", "image_url"],
        required: false,
      },
    ],
    order: [["id", "DESC"]],
  });

  return (rows || []).map((m) => ({
    id: m.id,
    room_id: m.room_id,
    room: m.Room,
    user_uuid: m.user_uuid,
    role: m.role,
    status: m.status,
    invited_by_user_uuid: m.invited_by_user_uuid,
    inviter: m.inviter || null,
  }));
};

const searchInvitees = async ({ q, limit = 20, excludeRoomId }) => {
  const query = String(q || "").trim();
  if (query.length < 2) return [];

  let excludedUuids = new Set();
  if (excludeRoomId) {
    const members = await RoomMember.findAll({
      where: { room_id: Number(excludeRoomId) },
      attributes: ["user_uuid"],
      raw: true,
    });
    (members || []).forEach((m) => {
      if (m && m.user_uuid) excludedUuids.add(String(m.user_uuid));
    });
  }

  const users = await User.findAll({
    where: {
      [Op.or]: [
        { email: { [Op.iLike]: `%${query}%` } },
        { soprannome: { [Op.iLike]: `%${query}%` } },
      ],
    },
    attributes: ["uuid", "email", "soprannome", "image_url"],
    limit: Math.min(50, Math.max(1, Number(limit) || 20)),
    order: [["email", "ASC"]],
  });

  return (users || []).filter((u) => !excludedUuids.has(String(u.uuid)));
};

const inviteUserToRoom = async ({ room_id, inviter_uuid, invitee_uuid }) => {
  const rid = Number(room_id);
  if (!rid) throw new Error("room_id mancante");

  const room = await Room.findByPk(rid);
  if (!room) throw new Error("Room non trovata");

  if (String(room.name || "").toLowerCase() === "arena") {
    throw new Error("Inviti non necessari per Arena");
  }

  const isCreator = String(room.created_by_user_uuid || "") === String(inviter_uuid || "");
  const canInvite = isCreator || (await assertRoomOwner({ room_id: rid, user_uuid: inviter_uuid }));
  if (!canInvite) throw new Error("Non autorizzato");

  const invitee = await User.findByPk(invitee_uuid);
  if (!invitee) throw new Error("Utente non trovato");

  const [row] = await RoomMember.findOrCreate({
    where: { room_id: rid, user_uuid: invitee_uuid },
    defaults: {
      room_id: rid,
      user_uuid: invitee_uuid,
      role: "member",
      status: "pending",
      invited_by_user_uuid: inviter_uuid,
    },
  });

  if (row && row.status !== "accepted") {
    row.status = "pending";
    row.invited_by_user_uuid = inviter_uuid;
    if (!row.role) row.role = "member";
    await row.save();
  }

  return row;
};

const respondToInvitation = async ({ room_id, user_uuid, accept }) => {
  const rid = Number(room_id);
  if (!rid) throw new Error("room_id mancante");

  const membership = await RoomMember.findOne({
    where: { room_id: rid, user_uuid },
  });

  if (!membership || membership.status !== "pending") {
    throw new Error("Invito non trovato");
  }

  membership.status = accept ? "accepted" : "declined";
  await membership.save();
  return membership;
};

const createRoom = async ({ name, short_description, long_description, creator_uuid }) => {
  const room = await Room.create({
    name,
    short_description: short_description || null,
    long_description: long_description || null,
    created_by_user_uuid: creator_uuid,
  });

  await RoomMember.create({
    room_id: room.id,
    user_uuid: creator_uuid,
    role: "owner",
    status: "accepted",
    invited_by_user_uuid: creator_uuid,
  });

  return room;
};

const listRoomMembers = async (room_id) => {
  const members = await RoomMember.findAll({
    where: { room_id },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["uuid", "email", "soprannome", "image_url"],
        required: true,
      },
      {
        model: User,
        as: "inviter",
        attributes: ["uuid", "email", "soprannome", "image_url"],
        required: false,
      },
    ],
    order: [["id", "ASC"]],
  });

  return (members || []).map((m) => ({
    id: m.id,
    room_id: m.room_id,
    user_uuid: m.user_uuid,
    role: m.role,
    status: m.status,
    invited_by_user_uuid: m.invited_by_user_uuid,
    user: m.user,
    inviter: m.inviter || null,
  }));
};

const listRoomTournaments = async (room_id) => {
  const rows = await RoomTournament.findAll({
    where: { room_id },
    include: [
      {
        model: db.Tournament,
        required: true,
      },
    ],
    order: [["tournament_id", "ASC"]],
  });

  return (rows || []).map((r) => ({
    id: r.id,
    room_id: r.room_id,
    tournament_id: r.tournament_id,
    tournament: r.Tournament,
  }));
};

module.exports = {
  listRoomsForUser,
  createRoom,
  listRoomMembers,
  listRoomTournaments,
  listMyInvitations,
  searchInvitees,
  inviteUserToRoom,
  respondToInvitation,
};
