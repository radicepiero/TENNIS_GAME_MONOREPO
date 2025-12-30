const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/tournamentApiController");
const alberoController = require("../../controllers/api/treeApiController");
const { requireAdmin } = require("../../middleware/authMiddleware");

router.get("/", controller.getTournaments);
router.get("/users", controller.getTournamentsUsers); //get all users have ever played
router.get("/:tournamentId/users", controller.getTournamentUsers); //GET /tournaments/123/users →
router.get("/:id/scripts/", controller.getTournamentsScripts);
router.put("/:id/scripts", requireAdmin, controller.putTournamentScripts);
router.post("/:id/schedule", alberoController.create);
router.get("/:id/schedule", alberoController.getById);

router.get("/:id", controller.getTournament); //get tournament by ID
router.post("/", requireAdmin, controller.postTournament); //create new tournament
router.put("/:id", requireAdmin, controller.putTournament); //update tournament by ID
router.delete("/:id", requireAdmin, controller.deleteTournament); //delete tournament by ID.

// Ottiene i dettagli dell'utente 456 nel torneo 123get all users in a tournament by ID

module.exports = router;
