// routes/match.js
const express = require("express");
const router = express.Router();
const controller = require("../../controllers/api/matchApiController");

router.post("/", controller.createMatch);
router.get("/:uuid", controller.getMatchById);
router.get("/tree/:treeId", controller.getMatchesByTreeId);
router.patch("/:uuid", controller.updateMatch);
router.patch("/", controller.updateMultipleMatches);
router.delete("/:uuid", controller.deleteMatch);

module.exports = router;
