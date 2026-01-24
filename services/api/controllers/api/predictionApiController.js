const predictionService = require("../../services/predictionService");
const jwt = require("jsonwebtoken");
const tournamentService = require("../../services/tournamentService");

const isTournamentLockedForPredictions = (status) => {
  return ["completed", "in-progress", "excluded"].includes(String(status));
};

const assertTournamentEditable = async (tournamentId, res) => {
  if (!tournamentId) {
    res.status(400).json({ success: false, message: "tournament_id mancante" });
    return false;
  }

  try {
    const tournament = await tournamentService.getTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ success: false, message: "Torneo non trovato" });
      return false;
    }
    if (isTournamentLockedForPredictions(tournament.status)) {
      res.status(400).json({
        success: false,
        message: `Pronostici bloccati: torneo ${tournament.status}`,
      });
      return false;
    }
    return true;
  } catch (e) {
    res.status(500).json({ success: false, message: "Errore nel recupero del torneo" });
    return false;
  }
};

const getPredictions = async (req, res) => {
  try {
    const pr = await predictionService.readPredictions();
    res.status(200).json({ success: true, data: pr });
  } catch (error) {
    console.error("Errore nel recupero delle predictions:", error);
    res.status(500).json({ error: "Errore nel recupero dei dati" });
  }
};

const getPredictionCountsByTournament = async (req, res) => {
  try {
    const rows = await predictionService.countPredictionsByTournament();
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Errore nel conteggio delle predictions:", error);
    res.status(500).json({ success: false, message: "Errore nel recupero dei dati" });
  }
};

const getPredictionById = async (req, res) => {
  try {
    const { id } = req.params; // Estrai il parametro "id" dalla URL

    if (!id) {
      return res.status(400).json({ success: false, message: "ID mancante" });
    }

    const prediction = await predictionService.readPrediction(id);

    if (!prediction || prediction.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Prediction non trovata" });
    }

    res.status(200).json({ success: true, data: prediction });
  } catch (error) {
    console.error("Errore nel recupero della prediction:", error);
    res
      .status(500)
      .json({ success: false, message: "Errore interno del server" });
  }
};

const getPredictionsByUser = async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const predictions = await predictionService.readPredictionsUser(user_uuid);
    res.status(200).json({ success: true, data: predictions });
  } catch (error) {
    console.error("Errore nel recupero delle predictions user:", error);
    res.status(500).json({ success: false, message: "Errore interno del server" });
  }
};

const getPredictionsByUserForPlayer = async (req, res) => {
  try {
    const user = res.locals.user;
    const user_uuid = user && user.dataValues ? user.dataValues.uuid : null;
    if (!user_uuid) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const playerId = req.params && req.params.playerId ? String(req.params.playerId) : "";
    if (!playerId) {
      return res.status(400).json({ success: false, message: "playerId mancante" });
    }

    const rows = await predictionService.readPredictionsUserForPlayer(user_uuid, playerId);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Errore nel recupero delle predictions user per player:", error);
    res.status(500).json({ success: false, message: "Errore interno del server" });
  }
};

const getPredictionsByTournamentId = async (req, res) => {
  try {
    const { id } = req.params; // Estrai il parametro "id" dalla URL

    if (!id) {
      return res.status(400).json({ success: false, message: "ID mancante" });
    }

    const user = res.locals.user;
    const level = user && user.level ? String(user.level) : null;
    if (!user || !level) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (level === "friend") {
      const tournament = await tournamentService.getTournament(id);
      if (!tournament) {
        return res.status(404).json({ success: false, message: "Torneo non trovato" });
      }

      const st = tournament.status ? String(tournament.status).toLowerCase() : "";
      // In sviluppo i pronostici devono essere visibili almeno quando il torneo è in corso o completato
      if (st === "in-progress" || st === "completed") {
        // bypass cutoff
      } else if (st === "excluded") {
        return res.status(403).json({ success: false, message: "Torneo escluso dal gioco" });
      } else {
      const closeAt = tournament.chiusuraPronostici ? new Date(tournament.chiusuraPronostici) : null;
      const now = new Date();
      if (!closeAt || Number.isNaN(closeAt.getTime()) || now < closeAt) {
        return res.status(403).json({
          success: false,
          message: "Pronostici altri utenti non ancora visibili",
          chiusuraPronostici: tournament.chiusuraPronostici || null,
        });
      }
      }
    }

    const prediction = await predictionService.readPredictionsTournament(id);
    //console.log("DCcC", prediction);
    if (!prediction || prediction.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Prediction non trovate" });
    }

    res.status(200).json({ success: true, data: prediction });
  } catch (error) {
    console.error("Errore nel recupero delle prediction:", error);
    res.status(500).json({
      success: false,
      message: "Errore interno del server nel recupero delle predictions",
    });
  }
};

const getPredictionByUserIdTournamentId = async (req, res) => {
  try {
    const { id } = req.params; // Estrai il parametro "id" dalla URL
    if (!id) {
      return res.status(400).json({ success: false, message: "ID mancante" });
    }
    const user_uuid = res.locals.user.dataValues.uuid;

    const prediction =
      await predictionService.readPredictionByUserIdTournamentId(user_uuid, id);

    if (!prediction || prediction.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Prediction non trovata" });
    }

    res.status(200).json({ success: true, data: prediction });
  } catch (error) {
    console.error("Errore nel recupero della prediction:", error);
    res
      .status(500)
      .json({ success: false, message: "Errore interno del server" });
  }
};

const postPrediction = async (req, res) => {
  const prediction = req.body;

  prediction.user_uuid = res.locals.user.dataValues.uuid;

  console.log(req.cookies.jwt, "prediction.user_uuid", prediction.user_uuid);
  try {
    const ok = await assertTournamentEditable(prediction.tournament_id, res);
    if (!ok) return;

    const esistePrediction =
      await predictionService.readPredictionByUserIdTournamentId(
        prediction.user_uuid,
        prediction.tournament_id
      );
    console.log("esistePrediction", esistePrediction);
    if (esistePrediction.length === 0) {
      const newPred = await predictionService.createPrediction(prediction);
      res.status(200).json({ success: true, data: newPred });
    } else {
      await predictionService.deletePrediction(esistePrediction[0].id);
      const newPred = await predictionService.createPrediction(prediction);
      res.status(200).json({ success: true, data: newPred });
    }
  } catch (error) {
    res.status(500).json({ error: "Errore nel creare la prediction" });
  }
};

const deletePredictionById = async (req, res) => {
  const _prediction = req.body;
  console.log("req.cookies.jwt", req.cookies.jwt);
  let user_uuid = res.locals.user.dataValues.uuid;
  try {
    const ok = await assertTournamentEditable(_prediction.tournament_id, res);
    if (!ok) return;

    pred = await predictionService.readPredictionByUserIdTournamentId(
      user_uuid,
      _prediction.tournament_id
    );
    console.log("pred", pred);
    if (pred) {
      await predictionService.deletePrediction(pred[0].id);
      res.status(204).end();
    }
  } catch (error) {
    console.error("Errore nel cancellare la prediction:", error);
    res.status(500).json({ error: "Errore nel cancellare la prediction" });
  }
};

module.exports = {
  getPredictions,
  getPredictionCountsByTournament,
  getPredictionById,
  getPredictionsByTournamentId,
  getPredictionByUserIdTournamentId,
  getPredictionsByUser,
  getPredictionsByUserForPlayer,
  postPrediction,
  deletePredictionById,
};

const getUuidDaToken = async (token) => {
  jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
    console.log(process.env.JWT_SECRET, decodedToken);
    if (err) {
      console.log("errore nella codifica del token", err);
    } else {
      return await decodedToken.uuid;
    }
  });
};
