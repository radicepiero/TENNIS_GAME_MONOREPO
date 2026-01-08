const { Router } = require("express");
const router = Router();
const controller = require("../../controllers/api/friendDashboardApiController");
const { requireAuth } = require("../../middleware/authMiddleware");

router.get("/dashboard", requireAuth, controller.getFriendDashboard);

module.exports = router;
