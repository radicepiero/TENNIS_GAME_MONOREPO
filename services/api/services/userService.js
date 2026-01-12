const db = require("../models");
//const { sequelize } = require("../models");
const User = db.User;

const readUserByUuid = async (uuid) => {
  try {
    return await User.findByPk(uuid);
  } catch (error) {
    console.error("errore durante il recupero dell'utente");
  }
};

const getUserByMail = async (email) => {
  try {
    return await User.scope("withPassword").findOne({ where: { email } });
  } catch (error) {
    console.error("errore durante il recupero dell'utente");
  }
};

const deleteUser = async (uuid) => {
  try {
    return await User.destroy({
      where: { uuid },
    });
  } catch (error) {
    console.log("errore nella cancellazione dell'utente");
  }
};

const readUsers = async () => {
  try {
    return await User.findAll();
  } catch (error) {
    console.error("errore durante il recupero dell'utente");
  }
};

const postUser = async (emailOrPayload, password, soprannome) => {
  try {
    const payload =
      emailOrPayload && typeof emailOrPayload === "object"
        ? emailOrPayload
        : { email: emailOrPayload, password, soprannome };

    const createPayload = {
      email: payload.email,
      password: payload.password,
      soprannome: payload.soprannome,
    };
    if (typeof payload.level !== "undefined") createPayload.level = payload.level;
    if (typeof payload.active !== "undefined") createPayload.active = payload.active;
    if (typeof payload.image_url !== "undefined") createPayload.image_url = payload.image_url;

    return User.create(createPayload);
  } catch (error) {
    console.error("errore durante la creazione dello User");
    throw error;
  }
};

const updateActiveUser = async (uuid) => {
  try {
    return await User.update({ active: true }, { where: { uuid } });
  } catch (error) {
    console.error("errore durante l'aggiornamento dell'utente");
  }
};

const updateUserProfile = async (uuid, { soprannome, image_url }) => {
  try {
    const payload = {};
    if (typeof soprannome !== "undefined") payload.soprannome = soprannome;
    if (typeof image_url !== "undefined") payload.image_url = image_url;

    await User.update(payload, { where: { uuid } });
    return await User.findByPk(uuid);
  } catch (error) {
    console.error("errore durante l'aggiornamento del profilo");
  }
};

const UsersTournaments = db.UserTournament;
const Tournaments = db.Tournaments;

const getUsersTournaments = async () => {
  try {
    const users_tournaments = await User.findAll({
      include: [{ model: Tournaments, through: UsersTournaments }],
    });
    return users_tournaments;
  } catch (error) {
    console.error("Errore nel recupero degli utenti-tornei:", error);
  }
};

const getUserTournaments = async (user_uuid) => {
  try {
    const user_tournaments = await User.findByPk(user_uuid, {
      include: [{ model: Tournaments, through: UsersTournaments }],
    });
    return user_tournaments;
  } catch (error) {
    console.error("Errore nel recupero dei tornei dell'utente:", error);
  }
};
const getUserTournament = async (user_uuid, tournament_id) => {
  try {
    const user_tournament = await User.findOne({
      where: {
        user_uuid,
        tournament_id,
      },
      include: [{ model: Tournaments, through: UsersTournaments }],
    });
    return user_tournament;
  } catch (error) {
    console.error("Errore nel recupero dei tornei dell'utente:", error);
    console.log("Errore nel recupero del torneo utente");
  }
};

module.exports = {
  getUsersTournaments,
  getUserTournaments,
  getUserTournament,
  readUserByUuid,
  deleteUser,
  readUsers,
  getUserByMail,
  postUser,
  updateActiveUser,
  updateUserProfile,
};
