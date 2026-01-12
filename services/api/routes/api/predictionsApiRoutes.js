const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/predictionApiController"); //get all predictions
const { requireAuth } = require("../../middleware/authMiddleware");
/*router.use((req, res, next) => {
  console.log(req.url);
  next(); // Importante per far proseguire la richiesta
});*/
router.get("/counts/tournaments", controller.getPredictionCountsByTournament);
router.get("/", controller.getPredictions); //get predictions
router.get("/user", requireAuth, controller.getPredictionsByUser);
router.get("/tournaments/:id", requireAuth, controller.getPredictionsByTournamentId);
router.get(
  "/tournaments/:id/user",
  requireAuth,
  controller.getPredictionByUserIdTournamentId
);
router.get("/:id", controller.getPredictionById); //get player by ID
router.post("/", controller.postPrediction);
router.patch("/", controller.postPrediction);
router.put("/", controller.postPrediction);
router.delete("/", controller.deletePredictionById);

// Export the router
module.exports = router;
