const serviceUser = require("../../services/userService");
const bcrypt = require("bcrypt");
const { spedisciMailCambioPassword } = require("../../config/mailer");

const getUsers = async (req, res) => {
  try {
    const users = await serviceUser.readUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error("Errore nel recupero degli utenti:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
  }
};

const changePassword = async (req, res) => {
  try {
    const user = res.locals.user;
    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: "Dati mancanti" });
    }
    if (confirm_password && String(confirm_password) !== String(new_password)) {
      return res.status(400).json({ success: false, message: "Conferma password non valida" });
    }

    const ok = await bcrypt.compare(String(current_password), String(user.password || ""));
    if (!ok) {
      return res.status(400).json({ success: false, message: "Password attuale errata" });
    }

    user.password = String(new_password);
    await user.save();

    try {
      await spedisciMailCambioPassword("radice.p@gmail.com", user.email);
    } catch (e) {}

    return res.status(200).json({ success: true });
  } catch (error) {
    const msg = error && error.message ? String(error.message) : "Errore";
    return res.status(400).json({ success: false, message: msg });
  }
};

const getUser = async (req, res) => {
  try {
    console.log(req.params.uuid);
    const user = await serviceUser.readUserByUuid(req.params.uuid);
    res.status(200).json(user);
  } catch (error) {
    console.error("Errore nel recupero dell'utente:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
  }
};

const getUserByMail = async (req, res) => {
  try {
    console.log(req.params.mail);
    const user = await serviceUser.getUserByMail(req.params.mail);
    res.status(200).json(user);
  } catch (error) {
    console.error("Errore nel recupero dell'utente:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
  }
};

const postUser = async (req, res) => {
  try {
    const user = await serviceUser.postUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error("Errore nel creare l'utente:", error);
    res.status(500).json({ error: "Errore nel creare l'utente" });
  }
};

const deleteUser = async (req, res) => {
  try {
    await serviceUser.deleteUser(req.params.uuid);
    res.status(204).end();
  } catch (error) {
    console.error("Errore nel cancellare l'utente:", error);
    res.status(500).json({ error: "Errore nel cancellare l'utente" });
  }
};

const updateActiveUser = async (req, res) => {
  try {
    await serviceUser.updateActiveUser(req.params.uuid);
    res.status(200).end();
  } catch (error) {
    console.error("Errore nel modificare l'utente:", error);
    res.status(500).json({ error: "Errore nel modificare l'utente" });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { soprannome, image_url } = req.body || {};

    const updated = await serviceUser.updateUserProfile(req.params.uuid, {
      soprannome,
      image_url,
    });
    res.status(200).json(updated);
  } catch (error) {
    console.error("Errore nell'aggiornamento profilo:", error);
    res.status(500).json({ error: "Errore nell'aggiornamento profilo" });
  }
};
/*
const patchUser = async (req, res) => {
  try {
    await User.update(req.body, {
      where: { uuid: req.params.uuid },
    });
    res.status(200).end();
  } catch (error) {
    console.error("Errore nel modificare l'utente:", error);
    res.status(500).json({ error: "Errore nel modificare l'utente" });
  }
};
*/

//tutti gli utenti-tornei
const getUsersTournaments = async (req, res) => {
  try {
    const users_tournaments = await serviceUser.getUsersTournaments();
    res.status(200).json(users_tournaments);
  } catch (error) {
    console.error("Errore nel recupero degli utenti-tornei:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
  }
};
const getUserTournaments = async (req, res) => {
  try {
    const user_tournaments = await serviceUser.getUserTournaments(
      req.params.uuid
    );
    res.status(200).json(user_tournaments);
  } catch (error) {
    console.error("Errore nel recupero dei tornei dell'utente:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
  }
};
const getUserTournament = async (req, res) => {
  console.log(req.params.uuid, req.params.tournamentId);
  try {
    const user_tournament = await serviceUser.getUserTournament(
      req.params.uuid,
      req.params.tournamentId
    );
    res.status(200).json(user_tournament);
  } catch (error) {
    console.error("Errore nel recupero dei tornei dell'utente:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
  }
};

module.exports = {
  getUsers,
  getUser,
  getUserByMail,
  postUser,
  deleteUser,
  updateActiveUser,
  updateUserProfile,
  changePassword,
  // patchUser,

  getUsersTournaments,
  getUserTournaments,
  getUserTournament,
};
