const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/annualRankingApiController");

router.get("/:year", controller.getAnnualRanking);

module.exports = router;
