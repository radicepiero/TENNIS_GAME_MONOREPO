const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/tournamentApiController");
const alberoController = require("../../controllers/api/treeApiController");

router.get("/", controller.getTournaments);
router.get("/:id", controller.getTournament); //get tournament by ID
router.post("/", controller.postTournament); //create new tournament
router.delete("/:id", controller.deleteTournament); //delete tournament by ID.
router.put("/:id", controller.putTournament); //update tournament by ID
router.get("/users", controller.getTournamentsUsers); //get all users have ever played
router.get("/:tournamentId/users", controller.getTournamentUsers); //GET /tournaments/123/users →
router.get("/:id/scripts/", controller.getTournamentsScripts);
router.post("/:id/schedule", alberoController.create);
router.get("/:id/schedule", alberoController.getById);

// Ottiene i dettagli dell'utente 456 nel torneo 123get all users in a tournament by ID

module.exports = router;
