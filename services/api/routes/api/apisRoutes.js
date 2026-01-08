const { Router } = require("express");
const router = Router();

//router.use("/users",  requireAuth,  require("./userRoutes"));

router.use("/users", require("./usersApiRoutes"));
router.use("/tournaments", require("./tournamentsApiRoutes"));
router.use("/players", require("./playersApiRoutes"));
router.use("/predictions", require("./predictionsApiRoutes"));
router.use("/rankings", require("./rankingsApiRoutes"));
router.use("/scripts", require("./scriptsApiRoutes"));
router.use("/annual-ranking", require("./annualRankingApiRoutes"));
router.use("/trees", require("./treesApiRoutes"));
//router.use("/trees", require("./treesApiRoutes"));
router.use("/matches", require("./matchesApiRoutes"));
router.use("/friend", require("./friendDashboardApiRoutes"));
module.exports = router;
