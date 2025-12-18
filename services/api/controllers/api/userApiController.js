const serviceUser = require("../../services/userService");

const getUsers = async (req, res) => {
  try {
    const users = await serviceUser.readUsers();
    res.status(200).json(users);
  } catch (error) {
    console.error("Errore nel recupero degli utenti:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
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
  // patchUser,

  getUsersTournaments,
  getUserTournaments,
  getUserTournament,
};
