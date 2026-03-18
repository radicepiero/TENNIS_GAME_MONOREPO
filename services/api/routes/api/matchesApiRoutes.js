// routes/match.js
const express = require("express");
const router = express.Router();
const controller = require("../../controllers/api/matchApiController");
const { requireAdmin } = require("../../middleware/authMiddleware");

router.post("/", requireAdmin, controller.createMatch);
router.get("/:uuid", controller.getMatchById);
router.get("/tree/:treeId", controller.getMatchesByTreeId);
router.patch("/:uuid", requireAdmin, controller.updateMatch);
router.patch("/", requireAdmin, controller.updateMultipleMatches);
router.delete("/:uuid", requireAdmin, controller.deleteMatch);

module.exports = router;
