const { Router } = require("express");
const router = Router();

//router.use("/users",  requireAuth,  require("./userRoutes"));

router.use("/users", require("./usersApiRoutes"));
router.use("/tournaments", require("./tournamentsApiRoutes"));
router.use("/players", require("./playersApiRoutes"));
router.use("/predictions", require("./predictionsApiRoutes"));
router.use("/rankings", require("./rankingsApiRoutes"));
router.use("/trees", require("./treesApiRoutes"));
//router.use("/trees", require("./treesApiRoutes"));
router.use("/matches", require("./matchesApiRoutes"));
module.exports = router;
