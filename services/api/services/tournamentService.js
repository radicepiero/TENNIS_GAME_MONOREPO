const db = require("../models");

const Tournament = db.Tournament;
const Script = db.Script;
const { Op } = db.Sequelize;

const ensureNickname = (t) => {
  if (!t) return t;
  const name = t.name;
  const nick = t.nickname;
  if (name && (!nick || !String(nick).trim())) {
    if (typeof t.setDataValue === "function") t.setDataValue("nickname", name);
    else t.nickname = name;
  }
  return t;
};

const getTournaments = async () => {
  try {
    const tournaments = await Tournament.findAll({ order: [["datafine", "ASC"]] });
    for (const t of tournaments) ensureNickname(t);
    return tournaments;
  } catch (error) {
    console.error("Errore nel recupero dei tornei:", error);
    throw error;
  }
};

const getTournament = async (id) => {
  try {
    const tournament = await Tournament.findOne({
      where: { id },
    });
    return ensureNickname(tournament);
  } catch (error) {
    console.error("Errore nel recupero del torneo:", error);
    throw error;
  }
};

const getTournamentsScripts = async (tournamentId, scriptName) => {
  try {
    const whereClause1 = {};
    if (tournamentId) whereClause1.id = tournamentId;
    const whereClause2 = {};
    if (scriptName) whereClause2.name = scriptName;
    const scripts = await Tournament.findAll({
      //attributes:[id],
      where: whereClause1,
      include: [{ model: Script, required: false, where: whereClause2 }],
    });
    for (const t of scripts) ensureNickname(t);
    return scripts;
  } catch (error) {
    console.error("Errore durante il recupero degli script:", error);
    throw error;
  }
};

const postTournament = async (tournament) => {
  try {
    if (tournament && tournament.name && (!tournament.nickname || !String(tournament.nickname).trim())) {
      tournament.nickname = tournament.name;
    }
    return await Tournament.create(tournament);
  } catch (error) {
    console.error("Errore nel creare il torneo:", error);
    throw error;
  }
};

const deleteTournament = async (id) => {
  try {
    const tId = Number(id);
    if (!Number.isFinite(tId)) {
      const err = new Error("Invalid tournament id");
      err.statusCode = 400;
      throw err;
    }

    await db.sequelize.transaction(async (transaction) => {
      const tournament = await Tournament.findByPk(tId, { transaction });
      if (!tournament) {
        const err = new Error("Tournament not found");
        err.statusCode = 404;
        throw err;
      }

      // 1) Join table TournamentScript
      if (db.TournamentScript) {
        await db.TournamentScript.destroy({
          where: { tournament_id: tId },
          transaction,
        });
      }

      // 2) players_tournaments
      if (db.PlayerTournament) {
        await db.PlayerTournament.destroy({
          where: { tournament_id: tId },
          transaction,
        });
      }

      // 3) Predictions + PredictionRows
      if (db.Prediction) {
        const predictions = await db.Prediction.findAll({
          where: { tournament_id: tId },
          attributes: ["id"],
          transaction,
        });
        const predictionIds = predictions.map((p) => p.id);

        if (predictionIds.length > 0 && db.PredictionRow) {
          await db.PredictionRow.destroy({
            where: { prediction_id: { [Op.in]: predictionIds } },
            transaction,
          });
        }

        await db.Prediction.destroy({
          where: { tournament_id: tId },
          transaction,
        });
      }

      // 4) Trees + Matches (robust even if DB-level cascade isn't in place yet)
      if (db.Tree) {
        const trees = await db.Tree.findAll({
          where: {
            [Op.or]: [{ tournament_id: tId }, { tournament: String(tId) }],
          },
          attributes: ["id"],
          transaction,
        });
        const treeIds = trees.map((t) => t.id);

        if (treeIds.length > 0 && db.Match) {
          await db.Match.destroy({
            where: { treeId: { [Op.in]: treeIds } },
            transaction,
          });
        }

        await db.Tree.destroy({
          where: {
            [Op.or]: [{ tournament_id: tId }, { tournament: String(tId) }],
          },
          transaction,
        });
      }

      // 5) Tournament
      await Tournament.destroy({
        where: { id: tId },
        transaction,
      });
    });

    return true;
  } catch (error) {
    console.error("Errore nel cancellare il torneo:", error);
    throw error;
  }
};

const putTournament = async (id, tournament) => {
  try {
    if (tournament && tournament.name && (!tournament.nickname || !String(tournament.nickname).trim())) {
      tournament.nickname = tournament.name;
    }
    await Tournament.update(tournament, {
      where: { id },
    });
    return tournament;
  } catch (error) {
    console.error("Errore nel modificare il torneo:", error);
    throw error;
  }
};

const Users = db.User;
const UsersTournaments = db.UserTournament;
const Players = db.Player;
const players_tournaments = db.PlayerTournament;
const getTournamentsUsers = async () => {
  try {
    const users_tournaments = await UsersTournaments.findAll({
      include: [{ model: Users, through: UsersTournaments }],
    });
    return users_tournaments;
  } catch (error) {
    console.error("Errore nel recupero degli utenti-tornei:", error);
    throw error;
  }
};
//tutti gli  utenti di un  torneo
//che significa andare a vedere quali sono gli utenti che hanno fatto una prediction
const getTournamentUsers = async (id) => {
  try {
    const users_tournaments = await UsersTournaments.findOne({
      where: { tournament_id: id },
      include: [{ model: Users, through: UsersTournaments }],
    });
    return users_tournaments;
  } catch (error) {
    console.error("Errore nel recupero degli utenti di un torneo:", error);
    throw error;
  }
};
//un utente-torneo
const getTournamentUser = async (user_id, tournament_id) => {
  try {
    const users_tournaments = await UsersTournaments.findOne({
      where: {
        user_uuid: user_id,
        tournament_id: tournament_id,
      },
      include: [{ model: Users, through: UsersTournaments }],
    });
    return users_tournaments;
  } catch (error) {
    console.error("Errore nel recupero dell'utente-torneo:", error);
    throw error;
  }
};

//Inizia parte che lega i giocatori ai tornei
const getTournamentPlayers = async (id) => {
  try {
    const tournamentPlayers = await players_tournaments.findAll({
      where: { tournament_id: id },
      include: [
        {
          model: Players,
          attributes: ["id", "name", "country", "image_src", "image_alt"],
        },
      ],
    });
    return tournamentPlayers;
  } catch (error) {
    console.error("Errore nel recupero dei giocatori di un torneo:", error);
    throw error;
  }
};

const postAllPlayersToTournament = async (tournament_id) => {
  try {
    const players = await Players.findAll();

    // Crea una entry per ogni giocatore nella tabella players_tournaments
    const newEntries = await Promise.all(
      players.map((player) =>
        players_tournaments.create({
          player_id: player.id,
          tournament_id,
          rating: player.rating,
        })
      )
    );

    return newEntries;
  } catch (error) {
    console.error("Errore nell'aggiunta dei giocatori al torneo:", error);
    throw error;
  }
};

module.exports = {
  getTournaments,
  getTournament,
  getTournamentsScripts,
  postTournament,
  deleteTournament,
  putTournament,
  getTournamentsUsers,
  getTournamentUsers,
  getTournamentUser,
  getTournamentPlayers,
  postAllPlayersToTournament,
};
